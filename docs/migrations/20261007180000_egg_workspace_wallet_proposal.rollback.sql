-- DESIGN ONLY / NOT APPLIED. Stop/drain runtime and refund workers first.
-- Refuse schema rollback when ANY financial records exist; retain snapshots
-- and revert runtime only after use. This is not a permission to delete data.
BEGIN;
LOCK TABLE public.egg_credit_wallets_v2, public.egg_credit_periods_v2, public.egg_credit_operations_v2 IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.egg_credit_operations_v2)
     OR EXISTS (SELECT 1 FROM public.egg_credit_periods_v2)
     OR EXISTS (SELECT 1 FROM public.egg_credit_wallets_v2) THEN
    RAISE EXCEPTION 'Wallet history exists: preserve ledger; runtime-only rollback required';
  END IF;
END $$;
ALTER TABLE public.egg_credit_wallets_v2 DROP CONSTRAINT egg_credit_wallets_v2_current_period;
DROP TABLE public.egg_credit_operations_v2;
DROP TABLE public.egg_credit_periods_v2;
DROP TABLE public.egg_credit_wallets_v2;
COMMIT;
