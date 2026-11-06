-- Migration additive pour les créances clients ViewY.
-- Prérequis : supabase_migration_additif.sql a déjà été exécuté.
-- Aucun enregistrement n'est supprimé. Les paiements sont ventilés en FIFO.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.clients') IS NULL
    OR to_regclass('public.sales') IS NULL
    OR to_regclass('public.payments') IS NULL THEN
    RAISE EXCEPTION 'Prérequis manquants : exécutez d’abord supabase_migration_additif.sql (clients, sales et payments requis).';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'balance_due'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'client_id'
  ) THEN
    RAISE EXCEPTION 'Colonnes sales.balance_due/client_id manquantes : exécutez d’abord supabase_migration_additif.sql.';
  END IF;
END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'balance_fcfa'
  ) THEN
    EXECUTE 'UPDATE public.clients SET balance = balance_fcfa WHERE balance = 0 AND balance_fcfa IS NOT NULL';
  END IF;
END $$;

-- Préserver les anciennes créances client qui ne correspondent pas à une vente détaillée.
UPDATE public.clients c
SET opening_balance = GREATEST(
  COALESCE(c.balance, 0) - COALESCE((
    SELECT SUM(GREATEST(s.balance_due, 0))
    FROM public.sales s
    WHERE s.user_id = c.user_id AND s.client_id = c.id AND s.status = 'completed'
  ), 0),
  0
)
WHERE c.opening_balance = 0;

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  sale_id BIGINT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_allocations_payment_sale_unique UNIQUE (payment_id, sale_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_sale_id ON public.payment_allocations (sale_id);

ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_allocations'
      AND policyname = 'payment_allocations_select_own'
  ) THEN
    CREATE POLICY payment_allocations_select_own
      ON public.payment_allocations FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.id = payment_id AND p.user_id = auth.uid()
      ));
  END IF;
END $$;

GRANT SELECT ON public.payment_allocations TO authenticated;

CREATE OR REPLACE FUNCTION public.recalculate_client_balance(
  p_user_id UUID,
  p_client_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès refusé pour recalculer le solde client';
  END IF;

  PERFORM 1 FROM public.clients
  WHERE id = p_client_id AND user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client introuvable ou accès refusé';
  END IF;

  SELECT COALESCE(c.opening_balance, 0) + COALESCE(SUM(GREATEST(s.balance_due, 0)), 0)
  INTO v_balance
  FROM public.clients c
  LEFT JOIN public.sales s
    ON s.user_id = c.user_id AND s.client_id = c.id AND s.status = 'completed'
  WHERE c.id = p_client_id AND c.user_id = p_user_id
  GROUP BY c.opening_balance;

  UPDATE public.clients
  SET balance = v_balance, updated_at = NOW()
  WHERE id = p_client_id AND user_id = p_user_id;

  RETURN v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_client_balance(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_client_balance(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_payment(
  p_user_id UUID,
  p_client_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_reference TEXT,
  p_payment_date DATE,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client RECORD;
  v_sale RECORD;
  v_payment_id BIGINT;
  v_remaining NUMERIC;
  v_applied NUMERIC;
  v_sales_balance NUMERIC := 0;
  v_opening_applied NUMERIC := 0;
  v_total_applied NUMERIC := 0;
  v_new_balance NUMERIC := 0;
  v_applications JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès refusé pour enregistrer un paiement';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant reçu doit être supérieur à zéro';
  END IF;

  IF p_method NOT IN ('cash', 'mobile_money', 'card', 'transfer') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  SELECT * INTO v_client
  FROM public.clients
  WHERE id = p_client_id AND user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client introuvable ou accès refusé';
  END IF;

  SELECT COALESCE(SUM(GREATEST(balance_due, 0)), 0)
  INTO v_sales_balance
  FROM public.sales
  WHERE user_id = p_user_id AND client_id = p_client_id AND status = 'completed';

  v_new_balance := COALESCE(v_client.opening_balance, 0) + v_sales_balance;
  IF p_amount > COALESCE(v_client.balance, 0) OR p_amount > v_new_balance THEN
    RAISE EXCEPTION 'Le montant dépasse le total des créances restantes (%)', LEAST(COALESCE(v_client.balance, 0), v_new_balance);
  END IF;

  INSERT INTO public.payments (
    user_id, sale_id, client_id, amount, method, reference, payment_date, notes
  ) VALUES (
    p_user_id, NULL, p_client_id, p_amount, p_method, p_reference,
    COALESCE(p_payment_date, CURRENT_DATE), p_notes
  ) RETURNING id INTO v_payment_id;

  v_remaining := p_amount;
  v_opening_applied := LEAST(v_remaining, COALESCE(v_client.opening_balance, 0));
  IF v_opening_applied > 0 THEN
    UPDATE public.clients
    SET opening_balance = GREATEST(COALESCE(opening_balance, 0) - v_opening_applied, 0)
    WHERE id = p_client_id AND user_id = p_user_id;
    v_remaining := v_remaining - v_opening_applied;
    v_total_applied := v_total_applied + v_opening_applied;
    v_applications := v_applications || jsonb_build_array(jsonb_build_object(
      'sale_id', NULL,
      'reference', 'Solde antérieur',
      'amount', v_opening_applied
    ));
  END IF;

  FOR v_sale IN
    SELECT id, reference, balance_due
    FROM public.sales
    WHERE user_id = p_user_id
      AND client_id = p_client_id
      AND status = 'completed'
      AND balance_due > 0
    ORDER BY sale_date ASC, id ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_applied := LEAST(v_remaining, v_sale.balance_due);

    UPDATE public.sales
    SET paid_amount = COALESCE(paid_amount, 0) + v_applied,
        balance_due = GREATEST(balance_due - v_applied, 0),
        payment_status = CASE
          WHEN GREATEST(balance_due - v_applied, 0) = 0 THEN 'paid'
          WHEN COALESCE(paid_amount, 0) + v_applied > 0 THEN 'partial'
          ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = v_sale.id AND user_id = p_user_id;

    INSERT INTO public.payment_allocations (payment_id, sale_id, amount)
    VALUES (v_payment_id, v_sale.id, v_applied);

    v_applications := v_applications || jsonb_build_array(jsonb_build_object(
      'sale_id', v_sale.id,
      'reference', v_sale.reference,
      'amount', v_applied
    ));
    v_remaining := v_remaining - v_applied;
    v_total_applied := v_total_applied + v_applied;
  END LOOP;

  SELECT COALESCE(c.opening_balance, 0) + COALESCE(SUM(GREATEST(s.balance_due, 0)), 0)
  INTO v_new_balance
  FROM public.clients c
  LEFT JOIN public.sales s
    ON s.user_id = c.user_id AND s.client_id = c.id AND s.status = 'completed'
  WHERE c.id = p_client_id AND c.user_id = p_user_id
  GROUP BY c.opening_balance;

  UPDATE public.clients
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = p_client_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'total_applied', v_total_applied,
    'new_client_balance', v_new_balance,
    'applications', v_applications
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_payment(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_payment(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_client_debts(
  p_user_id UUID,
  p_client_id UUID
)
RETURNS TABLE (
  id BIGINT,
  reference TEXT,
  sale_date DATE,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  balance_due NUMERIC,
  payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès refusé pour consulter les créances';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clients WHERE clients.id = p_client_id AND clients.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Client introuvable ou accès refusé';
  END IF;

  RETURN QUERY
  SELECT s.id, s.reference, s.sale_date, s.total_amount,
         COALESCE(s.paid_amount, 0), s.balance_due, s.payment_status
  FROM public.sales s
  WHERE s.user_id = p_user_id AND s.client_id = p_client_id
    AND s.status = 'completed' AND s.balance_due > 0
  ORDER BY s.sale_date ASC, s.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_debts(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_debts(UUID, UUID) TO authenticated;

-- Synchronisation initiale des soldes dérivés à partir des créances réelles.
UPDATE public.clients c
SET balance = COALESCE(c.opening_balance, 0) + COALESCE((
  SELECT SUM(GREATEST(s.balance_due, 0))
  FROM public.sales s
  WHERE s.user_id = c.user_id AND s.client_id = c.id AND s.status = 'completed'
), 0),
updated_at = NOW();

COMMIT;

-- Vérifications post-migration (à lancer séparément dans SQL Editor)
-- SELECT to_regclass('public.payment_allocations') AS payment_allocations_table;
-- SELECT to_regprocedure('public.register_payment(uuid,uuid,numeric,text,text,date,text)') AS register_payment_rpc;
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'clients'
--   AND column_name IN ('balance', 'opening_balance', 'updated_at');

-- Rollback manuel (uniquement si vous souhaitez désinstaller cette fonctionnalité).
-- Attention : supprimer payment_allocations efface le détail de répartition des paiements.
-- DROP FUNCTION IF EXISTS public.get_client_debts(UUID, UUID);
-- DROP FUNCTION IF EXISTS public.register_payment(UUID, UUID, NUMERIC, TEXT, TEXT, DATE, TEXT);
-- DROP FUNCTION IF EXISTS public.recalculate_client_balance(UUID, UUID);
-- DROP TABLE IF EXISTS public.payment_allocations;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS opening_balance;