-- Refuse access to application data unless the authenticated account is active
-- and its validity date has not passed. Run this migration in Supabase SQL Editor.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_current_account_active()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounts AS account
    WHERE account.user_id = auth.uid()
      AND account.is_active IS TRUE
      AND account.validity_date::date >= CURRENT_DATE
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_account_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_account_active() TO authenticated, service_role;

-- Account lifecycle fields must only be changed by a trusted administrator.
DO $$
DECLARE
  account_policy RECORD;
BEGIN
  FOR account_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts'
      AND cmd IN ('UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.accounts', account_policy.policyname);
  END LOOP;
END;
$$;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enforce_active_account_select ON public.accounts;
CREATE POLICY enforce_active_account_select ON public.accounts
  AS RESTRICTIVE
  FOR SELECT
  USING (public.is_current_account_active());

CREATE OR REPLACE FUNCTION public.enforce_active_account_for_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public.is_current_account_active() THEN
    RAISE EXCEPTION 'Compte inactif ou expiré.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_active_account_for_write() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  target_table TEXT;
  protected_tables TEXT[] := ARRAY[
    'products',
    'sales',
    'expenses',
    'clients',
    'customers',
    'sale_items',
    'orders',
    'order_items',
    'stock_moves',
    'payments',
    'payment_allocations'
  ];
BEGIN
  FOREACH target_table IN ARRAY protected_tables
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
      EXECUTE format('DROP POLICY IF EXISTS enforce_active_account_access ON public.%I', target_table);
      EXECUTE format(
        'CREATE POLICY enforce_active_account_access ON public.%I AS RESTRICTIVE FOR ALL USING (public.is_current_account_active()) WITH CHECK (public.is_current_account_active())',
        target_table
      );
      EXECUTE format('DROP TRIGGER IF EXISTS enforce_active_account_write ON public.%I', target_table);
      EXECUTE format(
        'CREATE TRIGGER enforce_active_account_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_active_account_for_write()',
        target_table
      );
    END IF;
  END LOOP;
END;
$$;

-- SECURITY DEFINER would otherwise bypass the RLS policies for this read RPC.
DO $$
BEGIN
  IF to_regprocedure('public.get_client_debts(uuid,uuid)') IS NOT NULL THEN
    EXECUTE $function$
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
      SET search_path = pg_catalog, public, auth
      AS $body$
      BEGIN
        IF auth.uid() IS NULL
           OR auth.uid() IS DISTINCT FROM p_user_id
           OR NOT public.is_current_account_active() THEN
          RAISE EXCEPTION 'Accès refusé pour consulter les créances'
            USING ERRCODE = '42501';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.clients
          WHERE clients.id = p_client_id
            AND clients.user_id = p_user_id
        ) THEN
          RAISE EXCEPTION 'Client introuvable ou accès refusé';
        END IF;

        RETURN QUERY
        SELECT sale.id, sale.reference, sale.sale_date, sale.total_amount,
               COALESCE(sale.paid_amount, 0), sale.balance_due, sale.payment_status
        FROM public.sales AS sale
        WHERE sale.user_id = p_user_id
          AND sale.client_id = p_client_id
          AND sale.status = 'completed'
          AND sale.balance_due > 0
        ORDER BY sale.sale_date ASC, sale.id ASC;
      END;
      $body$;
    $function$;
  END IF;
END;
$$;

COMMIT;

-- Verify after applying:
-- SELECT public.is_current_account_active();
-- SELECT tablename, policyname, permissive, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public' AND policyname = 'enforce_active_account_access';
