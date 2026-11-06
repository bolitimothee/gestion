-- ============================================================
-- SCRIPT UNIQUE DE CORRECTIONS SUPABASE - ADDITIF ET TRANSACTIONNEL
-- ============================================================
-- Collez le script complet dans Supabase SQL Editor et exécutez-le une fois.
-- Il ne supprime ni table ni ligne et ne convertit pas les IDs existants.
-- Les champs manquants sont ajoutés et les fonctions sécurisées remplacées.
-- Le script s'annule si les IDs products.id / sales.id ne sont pas BIGINT.
--
-- Pour une base avec IDs UUID, arrêtez-vous: une migration dédiée est requise.
-- ============================================================

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
    RAISE EXCEPTION 'Schéma incompatible : products.id et sales.id doivent être BIGINT. Une base UUID existante nécessite une migration dédiée avant cette migration additive.';
  END IF;
END $$;

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. MODIFIER products (ajout sûr)
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'unit_price'
  ) THEN
    EXECUTE 'UPDATE public.products SET selling_price = unit_price WHERE selling_price = 0 AND unit_price IS NOT NULL';
  END IF;
END $$;

UPDATE public.products
SET min_stock = 5
WHERE min_stock IS NULL;

UPDATE public.products
SET is_active = TRUE
WHERE is_active IS NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. MODIFIER sales (ajout sûr et rétrocompatibilité)
-- ============================================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS total_discount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS sale_time TIME WITHOUT TIME ZONE DEFAULT LOCALTIME,
  ADD COLUMN IF NOT EXISTS request_id UUID,
  ADD COLUMN IF NOT EXISTS order_id BIGINT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_user_request_id
  ON public.sales (user_id, request_id)
  WHERE request_id IS NOT NULL;

UPDATE public.sales
SET paid_amount = COALESCE(paid_amount, total_amount),
    balance_due = CASE
      WHEN COALESCE(paid_amount, 0) = 0 THEN 0
      ELSE GREATEST(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0), 0)
    END,
    payment_status = CASE
      WHEN COALESCE(paid_amount, 0) = 0 THEN 'unpaid'
      WHEN COALESCE(paid_amount, 0) >= COALESCE(total_amount, 0) THEN 'paid'
      ELSE 'partial'
    END
WHERE paid_amount IS NULL OR paid_amount = 0;

UPDATE public.sales
SET client_name = customer_name
WHERE client_name IS NULL AND customer_name IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_payment_status_check'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_payment_status_check
      CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'refunded'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_status_check'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_status_check
      CHECK (status IN ('completed', 'cancelled', 'refunded'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'sales_client_id_fkey'
    ) THEN
      ALTER TABLE public.sales
        ADD CONSTRAINT sales_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.clients(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_sales_updated_at ON public.sales;
CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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

-- ============================================================
-- 3. CRÉER la table clients si elle n'existe pas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_name TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (email);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_select_own'
  ) THEN
    CREATE POLICY "clients_select_own"
      ON public.clients FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_insert_own'
  ) THEN
    CREATE POLICY "clients_insert_own"
      ON public.clients FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_update_own'
  ) THEN
    CREATE POLICY "clients_update_own"
      ON public.clients FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_delete_own'
  ) THEN
    CREATE POLICY "clients_delete_own"
      ON public.clients FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. MIGRATION customers -> clients (sans supprimer customers)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) THEN
    INSERT INTO public.clients (user_id, name, phone, email, address, balance, notes, created_at, updated_at)
    SELECT
      c.user_id,
      c.name,
      c.phone,
      c.email,
      c.address,
      COALESCE(c.balance_fcfa, 0),
      c.notes,
      COALESCE(c.created_at, NOW()),
      NOW()
    FROM public.customers c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.clients cl
      WHERE cl.user_id = c.user_id
        AND (
          (cl.email IS NOT DISTINCT FROM c.email)
          OR (cl.name = c.name AND cl.phone IS NOT DISTINCT FROM c.phone)
        )
    );
  END IF;
END $$;

-- ============================================================
-- 5. CRÉER sale_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sale_id BIGINT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  unit_cost NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_user_id ON public.sale_items (user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sale_items' AND policyname = 'sale_items_select_own'
  ) THEN
    CREATE POLICY "sale_items_select_own"
      ON public.sale_items FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sale_items' AND policyname = 'sale_items_insert_own'
  ) THEN
    CREATE POLICY "sale_items_insert_own"
      ON public.sale_items FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sale_items' AND policyname = 'sale_items_update_own'
  ) THEN
    CREATE POLICY "sale_items_update_own"
      ON public.sale_items FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sale_items' AND policyname = 'sale_items_delete_own'
  ) THEN
    CREATE POLICY "sale_items_delete_own"
      ON public.sale_items FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 6. CRÉER orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reference TEXT,
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
  sale_id BIGINT REFERENCES public.sales(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders (client_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders (user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_sale_id ON public.orders (sale_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders (order_date DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_select_own'
  ) THEN
    CREATE POLICY "orders_select_own"
      ON public.orders FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_insert_own'
  ) THEN
    CREATE POLICY "orders_insert_own"
      ON public.orders FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_update_own'
  ) THEN
    CREATE POLICY "orders_update_own"
      ON public.orders FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_delete_own'
  ) THEN
    CREATE POLICY "orders_delete_own"
      ON public.orders FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.reset_order_after_sale_unlinked()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.sale_id IS NOT NULL AND NEW.sale_id IS NULL THEN
    NEW.status := 'pending';
    NEW.delivery_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_reset_after_sale_unlinked ON public.orders;
CREATE TRIGGER trg_order_reset_after_sale_unlinked
BEFORE UPDATE OF sale_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.reset_order_after_sale_unlinked();

-- ============================================================
-- 7. CRÉER order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_user_id ON public.order_items (user_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_select_own'
  ) THEN
    CREATE POLICY "order_items_select_own"
      ON public.order_items FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_insert_own'
  ) THEN
    CREATE POLICY "order_items_insert_own"
      ON public.order_items FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_update_own'
  ) THEN
    CREATE POLICY "order_items_update_own"
      ON public.order_items FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_delete_own'
  ) THEN
    CREATE POLICY "order_items_delete_own"
      ON public.order_items FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

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

-- ============================================================
-- 8. CRÉER stock_moves
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_moves (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjust', 'return')),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT,
  reference_id BIGINT,
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_moves_user_product ON public.stock_moves (user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_user_created_at ON public.stock_moves (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_moves_reference ON public.stock_moves (reference_id, reference_type);

ALTER TABLE public.stock_moves ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_moves' AND policyname = 'stock_moves_select_own'
  ) THEN
    CREATE POLICY "stock_moves_select_own"
      ON public.stock_moves FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_moves' AND policyname = 'stock_moves_insert_own'
  ) THEN
    CREATE POLICY "stock_moves_insert_own"
      ON public.stock_moves FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_moves' AND policyname = 'stock_moves_update_own'
  ) THEN
    CREATE POLICY "stock_moves_update_own"
      ON public.stock_moves FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_moves' AND policyname = 'stock_moves_delete_own'
  ) THEN
    CREATE POLICY "stock_moves_delete_own"
      ON public.stock_moves FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 9. CRÉER payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sale_id BIGINT REFERENCES public.sales(id),
  client_id UUID REFERENCES public.clients(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('cash', 'mobile_money', 'card', 'transfer', 'credit')),
  reference TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_sale ON public.payments (user_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON public.payments (user_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments (client_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_select_own'
  ) THEN
    CREATE POLICY "payments_select_own"
      ON public.payments FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_insert_own'
  ) THEN
    CREATE POLICY "payments_insert_own"
      ON public.payments FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_update_own'
  ) THEN
    CREATE POLICY "payments_update_own"
      ON public.payments FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_delete_own'
  ) THEN
    CREATE POLICY "payments_delete_own"
      ON public.payments FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 10. RPC create_sale (transaction atomique)
-- ============================================================
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
  SET sale_id = NULL,
      status = 'pending',
      delivery_date = NULL
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

-- ============================================================
-- 11. INDEX supplémentaires de sécurité et d'usage
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_user_active ON public.products (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_user_min_stock ON public.products (user_id, min_stock);
CREATE INDEX IF NOT EXISTS idx_sales_user_reference ON public.sales (user_id, reference);
CREATE INDEX IF NOT EXISTS idx_sales_user_client ON public.sales (user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales (user_id, sale_date DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_customers_user_name ON public.customers (user_id, name);
  END IF;
END $$;

-- ============================================================
-- 12. VÉRIFICATIONS RAPIDES (à exécuter manuellement)
-- ============================================================
-- SELECT * FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('products', 'sales', 'sale_items', 'orders', 'order_items', 'stock_moves', 'payments', 'clients');
--
-- SELECT * FROM public.sales LIMIT 10;
-- SELECT * FROM public.clients LIMIT 10;
--
-- SELECT public.create_sale(
--   '00000000-0000-0000-0000-000000000000'::UUID,
--   '[{"product_id": 1, "product_name": "Produit test", "quantity": 1, "unit_price": 1000, "unit_cost": 700, "discount": 0, "subtotal": 1000}]'::jsonb,
--   NULL,
--   'Client test',
--   '0000000000',
--   'cash',
--   1000,
--   1000,
--   0,
--   0,
--   'Test de vente'
-- );

COMMIT;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
