-- Corrige sale_time et autorise chaque utilisateur à supprimer ses propres ventes.
-- Ce script remplace la RPC create_sale et ajoute une politique RLS idempotente.
-- Les lignes existantes ne sont pas converties; request_id est ajouté pour l'idempotence.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'id' AND data_type <> 'bigint'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales'
      AND column_name = 'id' AND data_type <> 'bigint'
  ) THEN
    RAISE EXCEPTION 'Schéma incompatible : products.id et sales.id doivent être BIGINT. Une base UUID existante nécessite une migration dédiée avant ce script.';
  END IF;
END $$;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS request_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_user_request_id
  ON public.sales (user_id, request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_sale(
  p_user_id UUID,
  p_items JSONB,
  p_client_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_payment_method TEXT,
  p_total_amount NUMERIC,
  p_paid_amount NUMERIC,
  p_balance_due NUMERIC,
  p_total_discount NUMERIC,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id BIGINT;
  v_reference TEXT;
  v_item JSONB;
  v_product RECORD;
  v_new_stock INTEGER;
  v_payment_status TEXT;
  v_total_quantity INTEGER;
  v_average_unit_price NUMERIC;
  v_distinct_products INTEGER;
  v_primary_product_id BIGINT;
  v_request_id UUID;
  v_existing_sale RECORD;
  v_balance_due NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès refusé pour créer une vente';
  END IF;

  IF p_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients WHERE id = p_client_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Client introuvable ou accès refusé';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items doit être un tableau JSONB de produits';
  END IF;

  v_request_id := NULLIF(p_items->0->>'request_id', '')::UUID;
  IF v_request_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT), hashtext(v_request_id::TEXT));
    SELECT id, reference, payment_status INTO v_existing_sale
    FROM public.sales
    WHERE user_id = p_user_id AND request_id = v_request_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'sale_id', v_existing_sale.id,
        'reference', v_existing_sale.reference,
        'payment_status', v_existing_sale.payment_status,
        'duplicate', TRUE
      );
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE((v_item->>'quantity')::INTEGER, 0) <= 0 THEN
      RAISE EXCEPTION 'Chaque article doit avoir une quantité positive';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::BIGINT
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable : %', v_item->>'product_name';
    END IF;

    IF v_product.quantity < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Stock insuffisant pour % (dispo : %, demandé : %)',
        v_product.name,
        v_product.quantity,
        v_item->>'quantity';
    END IF;
  END LOOP;

  SELECT
    COALESCE(SUM((item->>'quantity')::INTEGER), 0)::INTEGER,
    COALESCE(
      SUM((item->>'unit_price')::NUMERIC * (item->>'quantity')::INTEGER)
        / NULLIF(SUM((item->>'quantity')::INTEGER), 0),
      0
    ),
    COUNT(DISTINCT (item->>'product_id')::BIGINT)::INTEGER,
    MIN((item->>'product_id')::BIGINT)
  INTO v_total_quantity, v_average_unit_price, v_distinct_products, v_primary_product_id
  FROM jsonb_array_elements(p_items) AS items(item);

  IF v_total_quantity <= 0 THEN
    RAISE EXCEPTION 'La vente doit contenir au moins un article';
  END IF;

  IF p_total_amount IS NULL OR p_paid_amount IS NULL OR p_total_amount <= 0
    OR p_paid_amount < 0 OR p_paid_amount > p_total_amount THEN
    RAISE EXCEPTION 'Montant de vente ou paiement invalide';
  END IF;
  v_balance_due := p_total_amount - p_paid_amount;

  IF v_distinct_products <> 1 THEN
    v_primary_product_id := NULL;
  END IF;

  SELECT 'VTE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(
    (COALESCE(MAX(CAST(SUBSTRING(reference FROM '\d+$') AS INTEGER)), 0) + 1)::TEXT,
    4,
    '0'
  )
  INTO v_reference
  FROM public.sales
  WHERE user_id = p_user_id
    AND reference LIKE 'VTE-%';

  IF p_paid_amount = 0 THEN
    v_payment_status := 'unpaid';
  ELSIF p_paid_amount >= p_total_amount THEN
    v_payment_status := 'paid';
  ELSE
    v_payment_status := 'partial';
  END IF;

  INSERT INTO public.sales (
    user_id,
    reference,
    client_id,
    client_name,
    customer_name,
    product_id,
    request_id,
    quantity,
    unit_price,
    total_amount,
    total_discount,
    paid_amount,
    balance_due,
    payment_status,
    sale_date,
    sale_time,
    notes,
    status
  )
  VALUES (
    p_user_id,
    v_reference,
    p_client_id,
    p_client_name,
    p_client_name,
    v_primary_product_id,
    v_request_id,
    v_total_quantity,
    v_average_unit_price,
    p_total_amount,
    p_total_discount,
    p_paid_amount,
    v_balance_due,
    v_payment_status,
    CURRENT_DATE,
    LOCALTIME,
    p_notes,
    'completed'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::BIGINT
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable : %', v_item->>'product_name';
    END IF;

    IF v_product.quantity < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Stock insuffisant pour % (dispo : %, demandé : %)',
        v_product.name, v_product.quantity, v_item->>'quantity';
    END IF;

    INSERT INTO public.sale_items (
      sale_id,
      user_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      unit_cost,
      discount,
      subtotal
    )
    VALUES (
      v_sale_id,
      p_user_id,
      (v_item->>'product_id')::BIGINT,
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE(v_product.purchase_price, 0),
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      COALESCE((v_item->>'subtotal')::NUMERIC, 0)
    );

    v_new_stock := v_product.quantity - (v_item->>'quantity')::INTEGER;

    INSERT INTO public.stock_moves (
      user_id,
      product_id,
      type,
      quantity,
      quantity_before,
      quantity_after,
      reason,
      reference_id,
      reference_type
    )
    VALUES (
      p_user_id,
      (v_item->>'product_id')::BIGINT,
      'out',
      -((v_item->>'quantity')::INTEGER),
      v_product.quantity,
      v_new_stock,
      'sale',
      v_sale_id,
      'sale'
    );

    UPDATE public.products
    SET quantity = v_new_stock,
        updated_at = NOW()
    WHERE id = (v_item->>'product_id')::BIGINT
      AND user_id = p_user_id;
  END LOOP;

  IF p_paid_amount > 0 THEN
    INSERT INTO public.payments (
      user_id,
      sale_id,
      client_id,
      amount,
      method,
      payment_date
    )
    VALUES (
      p_user_id,
      v_sale_id,
      p_client_id,
      p_paid_amount,
      p_payment_method,
      CURRENT_DATE
    );
  END IF;

  IF p_client_id IS NOT NULL AND v_balance_due > 0 THEN
    UPDATE public.clients
    SET balance = COALESCE(balance, 0) + v_balance_due,
        updated_at = NOW()
    WHERE id = p_client_id;
  END IF;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'reference', v_reference,
    'payment_status', v_payment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale(UUID, JSONB, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale(UUID, JSONB, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sales'
      AND policyname = 'sales_delete_own'
  ) THEN
    CREATE POLICY "sales_delete_own"
      ON public.sales FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_sale(
  p_user_id UUID,
  p_sale_id BIGINT,
  p_product_id BIGINT,
  p_quantity INTEGER,
  p_client_id UUID,
  p_client_name TEXT,
  p_sale_date DATE,
  p_sale_time TIME,
  p_payment_method TEXT,
  p_paid_amount NUMERIC,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale RECORD;
  v_product RECORD;
  v_old_product_id BIGINT;
  v_old_quantity INTEGER;
  v_old_stock_before INTEGER;
  v_old_stock_after INTEGER;
  v_new_stock_before INTEGER;
  v_new_stock_after INTEGER;
  v_total_amount NUMERIC;
  v_balance_due NUMERIC;
  v_payment_status TEXT;
  v_item_count INTEGER;
  v_order_item_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès refusé pour modifier une vente';
  END IF;

  IF p_quantity <= 0 OR p_paid_amount < 0 THEN
    RAISE EXCEPTION 'Quantité ou paiement invalide';
  END IF;

  IF p_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients WHERE id = p_client_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Client introuvable ou accès refusé';
  END IF;

  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vente introuvable';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_item_count
  FROM public.sale_items
  WHERE sale_id = p_sale_id AND user_id = p_user_id;

  IF v_item_count > 1 THEN
    RAISE EXCEPTION 'La modification des ventes multi-produits n’est pas disponible';
  END IF;

  SELECT product_id, quantity
  INTO v_old_product_id, v_old_quantity
  FROM public.sale_items
  WHERE sale_id = p_sale_id AND user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    v_old_product_id := v_sale.product_id;
    v_old_quantity := v_sale.quantity;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_order_item_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.sale_id = p_sale_id AND o.user_id = p_user_id;

  IF v_order_item_count > 1 THEN
    RAISE EXCEPTION 'La modification d’une commande multi-produits n’est pas disponible';
  END IF;

  PERFORM id
  FROM public.products
  WHERE user_id = p_user_id AND id IN (v_old_product_id, p_product_id)
  ORDER BY id
  FOR UPDATE;

  IF v_old_product_id IS NOT NULL THEN
    SELECT quantity INTO v_old_stock_before
    FROM public.products
    WHERE id = v_old_product_id AND user_id = p_user_id;

    IF FOUND THEN
      v_old_stock_after := v_old_stock_before + v_old_quantity;
      UPDATE public.products
      SET quantity = v_old_stock_after, updated_at = NOW()
      WHERE id = v_old_product_id AND user_id = p_user_id;

      INSERT INTO public.stock_moves (
        user_id, product_id, type, quantity, quantity_before,
        quantity_after, reason, reference_id, reference_type
      )
      VALUES (
        p_user_id, v_old_product_id, 'return', v_old_quantity,
        v_old_stock_before, v_old_stock_after, 'sale_updated', p_sale_id, 'sale'
      );
    END IF;
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id AND user_id = p_user_id AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable ou inactif';
  END IF;

  IF v_product.quantity < p_quantity THEN
    RAISE EXCEPTION 'Stock insuffisant (% disponibles)', v_product.quantity;
  END IF;

  v_new_stock_before := v_product.quantity;
  v_new_stock_after := v_new_stock_before - p_quantity;
  v_total_amount := v_product.selling_price * p_quantity;
  IF p_paid_amount > v_total_amount THEN
    RAISE EXCEPTION 'Le montant payé dépasse le montant de la vente';
  END IF;

  v_balance_due := v_total_amount - p_paid_amount;
  v_payment_status := CASE
    WHEN p_paid_amount = 0 THEN 'unpaid'
    WHEN p_paid_amount >= v_total_amount THEN 'paid'
    ELSE 'partial'
  END;

  UPDATE public.products
  SET quantity = v_new_stock_after, updated_at = NOW()
  WHERE id = p_product_id AND user_id = p_user_id;

  INSERT INTO public.stock_moves (
    user_id, product_id, type, quantity, quantity_before,
    quantity_after, reason, reference_id, reference_type
  )
  VALUES (
    p_user_id, p_product_id, 'out', -p_quantity,
    v_new_stock_before, v_new_stock_after, 'sale_updated', p_sale_id, 'sale'
  );

  IF v_sale.client_id IS NOT NULL AND COALESCE(v_sale.balance_due, 0) > 0 THEN
    UPDATE public.clients
    SET balance = GREATEST(COALESCE(balance, 0) - v_sale.balance_due, 0), updated_at = NOW()
    WHERE id = v_sale.client_id AND user_id = p_user_id;
  END IF;

  IF p_client_id IS NOT NULL AND v_balance_due > 0 THEN
    UPDATE public.clients
    SET balance = COALESCE(balance, 0) + v_balance_due, updated_at = NOW()
    WHERE id = p_client_id AND user_id = p_user_id;
  END IF;

  DELETE FROM public.payments WHERE sale_id = p_sale_id AND user_id = p_user_id;
  IF p_paid_amount > 0 THEN
    INSERT INTO public.payments (user_id, sale_id, client_id, amount, method, payment_date)
    VALUES (p_user_id, p_sale_id, p_client_id, p_paid_amount, p_payment_method, CURRENT_DATE);
  END IF;

  DELETE FROM public.sale_items WHERE sale_id = p_sale_id AND user_id = p_user_id;
  INSERT INTO public.sale_items (
    sale_id, user_id, product_id, product_name, quantity,
    unit_price, unit_cost, discount, subtotal
  )
  VALUES (
    p_sale_id, p_user_id, p_product_id, v_product.name, p_quantity,
    v_product.selling_price, v_product.purchase_price, 0, v_total_amount
  );

  UPDATE public.sales
  SET product_id = p_product_id,
      quantity = p_quantity,
      unit_price = v_product.selling_price,
      total_amount = v_total_amount,
      total_discount = 0,
      client_id = p_client_id,
      client_name = p_client_name,
      customer_name = p_client_name,
      paid_amount = p_paid_amount,
      balance_due = v_balance_due,
      payment_status = v_payment_status,
      sale_date = p_sale_date,
      sale_time = p_sale_time,
      notes = p_notes
  WHERE id = p_sale_id AND user_id = p_user_id;

  UPDATE public.order_items
  SET product_id = p_product_id,
      product_name = v_product.name,
      quantity = p_quantity,
      unit_price = v_product.selling_price,
      subtotal = v_total_amount
  WHERE order_id IN (SELECT id FROM public.orders WHERE sale_id = p_sale_id AND user_id = p_user_id)
    AND user_id = p_user_id;

  UPDATE public.orders
  SET total_amount = v_total_amount,
      client_id = p_client_id,
      client_name = p_client_name
  WHERE sale_id = p_sale_id AND user_id = p_user_id;

  RETURN jsonb_build_object('sale_id', p_sale_id, 'total_amount', v_total_amount, 'balance_due', v_balance_due);
END;
$$;

REVOKE ALL ON FUNCTION public.update_sale(UUID, BIGINT, BIGINT, INTEGER, UUID, TEXT, DATE, TIME, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_sale(UUID, BIGINT, BIGINT, INTEGER, UUID, TEXT, DATE, TIME, TEXT, NUMERIC, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_sale(p_sale_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_sale RECORD;
  v_item RECORD;
  v_quantity_before INTEGER;
  v_quantity_after INTEGER;
  v_has_items BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise pour supprimer une vente';
  END IF;

  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND OR v_sale.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Vente introuvable ou accès refusé';
  END IF;

  UPDATE public.orders
  SET sale_id = NULL
  WHERE sale_id = p_sale_id AND user_id = v_user_id;

  UPDATE public.payments
  SET sale_id = NULL
  WHERE sale_id = p_sale_id AND user_id = v_user_id;

  IF v_sale.client_id IS NOT NULL AND COALESCE(v_sale.balance_due, 0) > 0 THEN
    UPDATE public.clients
    SET balance = GREATEST(COALESCE(balance, 0) - v_sale.balance_due, 0),
        updated_at = NOW()
    WHERE id = v_sale.client_id AND user_id = v_user_id;
  END IF;

  FOR v_item IN
    SELECT product_id, SUM(quantity)::INTEGER AS quantity
    FROM public.sale_items
    WHERE sale_id = p_sale_id AND user_id = v_user_id
    GROUP BY product_id
  LOOP
    v_has_items := TRUE;

    SELECT quantity INTO v_quantity_before
    FROM public.products
    WHERE id = v_item.product_id AND user_id = v_user_id
    FOR UPDATE;

    IF FOUND THEN
      v_quantity_after := v_quantity_before + v_item.quantity;
      UPDATE public.products
      SET quantity = v_quantity_after, updated_at = NOW()
      WHERE id = v_item.product_id AND user_id = v_user_id;

      INSERT INTO public.stock_moves (
        user_id, product_id, type, quantity, quantity_before,
        quantity_after, reason, reference_id, reference_type
      )
      VALUES (
        v_user_id, v_item.product_id, 'return', v_item.quantity,
        v_quantity_before, v_quantity_after, 'sale_deleted', p_sale_id, 'sale'
      );
    END IF;
  END LOOP;

  IF NOT v_has_items AND v_sale.product_id IS NOT NULL THEN
    SELECT quantity INTO v_quantity_before
    FROM public.products
    WHERE id = v_sale.product_id AND user_id = v_user_id
    FOR UPDATE;

    IF FOUND THEN
      v_quantity_after := v_quantity_before + v_sale.quantity;
      UPDATE public.products
      SET quantity = v_quantity_after, updated_at = NOW()
      WHERE id = v_sale.product_id AND user_id = v_user_id;

      INSERT INTO public.stock_moves (
        user_id, product_id, type, quantity, quantity_before,
        quantity_after, reason, reference_id, reference_type
      )
      VALUES (
        v_user_id, v_sale.product_id, 'return', v_sale.quantity,
        v_quantity_before, v_quantity_after, 'sale_deleted', p_sale_id, 'sale'
      );
    END IF;
  END IF;

  DELETE FROM public.sales
  WHERE id = p_sale_id AND user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_sale(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_sale(BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id UUID,
  p_reference TEXT,
  p_client_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_order_date DATE,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id BIGINT;
  v_item JSONB;
  v_product RECORD;
  v_total_amount NUMERIC := 0;
  v_quantity INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès refusé pour créer une commande';
  END IF;

  IF p_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients WHERE id = p_client_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Client introuvable ou accès refusé';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La commande doit contenir au moins un article';
  END IF;

  INSERT INTO public.orders (
    user_id, reference, client_id, client_name, client_phone,
    order_date, total_amount, status, notes
  )
  VALUES (
    p_user_id, p_reference, p_client_id, p_client_name, p_client_phone,
    COALESCE(p_order_date, CURRENT_DATE), 0, 'pending', p_notes
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 0);
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Chaque article doit avoir une quantité positive';
    END IF;

    SELECT id, name, selling_price
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::BIGINT
      AND user_id = p_user_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable ou inactif : %', v_item->>'product_id';
    END IF;

    v_total_amount := v_total_amount + (v_product.selling_price * v_quantity);

    INSERT INTO public.order_items (
      order_id, user_id, product_id, product_name, quantity, unit_price, subtotal
    )
    VALUES (
      v_order_id, p_user_id, v_product.id, v_product.name, v_quantity,
      v_product.selling_price, v_product.selling_price * v_quantity
    );
  END LOOP;

  UPDATE public.orders
  SET total_amount = v_total_amount
  WHERE id = v_order_id AND user_id = p_user_id;

  RETURN jsonb_build_object('id', v_order_id, 'reference', p_reference, 'total_amount', v_total_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(UUID, TEXT, UUID, TEXT, TEXT, DATE, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(UUID, TEXT, UUID, TEXT, TEXT, DATE, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.deliver_order(
  p_user_id UUID,
  p_order_id BIGINT,
  p_payment_method TEXT,
  p_paid_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_sale JSONB;
  v_sale_id BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès refusé pour livrer une commande';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.status <> 'pending' OR v_order.sale_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cette commande n’est plus en attente de livraison';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'product_id', product_id,
    'product_name', product_name,
    'quantity', quantity,
    'unit_price', unit_price,
    'subtotal', subtotal
  ) ORDER BY id)
  INTO v_items
  FROM public.order_items
  WHERE order_id = p_order_id AND user_id = p_user_id;

  v_sale := public.create_sale(
    p_user_id,
    v_items,
    v_order.client_id,
    v_order.client_name,
    v_order.client_phone,
    p_payment_method,
    v_order.total_amount,
    p_paid_amount,
    GREATEST(v_order.total_amount - p_paid_amount, 0),
    0,
    v_order.notes
  );
  v_sale_id := (v_sale->>'sale_id')::BIGINT;

  UPDATE public.orders
  SET status = 'delivered', delivery_date = CURRENT_DATE, sale_id = v_sale_id
  WHERE id = p_order_id AND user_id = p_user_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'sale_id', v_sale_id, 'status', 'delivered');
END;
$$;

REVOKE ALL ON FUNCTION public.deliver_order(UUID, BIGINT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deliver_order(UUID, BIGINT, TEXT, NUMERIC) TO authenticated;

COMMIT;
