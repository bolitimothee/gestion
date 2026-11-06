-- Corrige le statut des commandes lorsqu'une vente associée est détachée.
-- À exécuter une seule fois dans Supabase SQL Editor; la migration est idempotente.

BEGIN;

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

COMMIT;