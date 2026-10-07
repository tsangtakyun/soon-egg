-- DESIGN ONLY. Disable charging and stop/drain workers BEFORE rollback.
-- This rollback is deliberately limited to an unused schema. Never delete
-- financial history after usage; snapshot and retain it, revert runtime only.
BEGIN;
LOCK TABLE public.egg_credit_wallets_v2, public.egg_credit_operations_v2 IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.egg_credit_operations_v2)
     OR EXISTS (SELECT 1 FROM public.egg_credit_wallets_v2) THEN
    RAISE EXCEPTION 'Wallet records exist: preserve ledger; runtime-only rollback required';
  END IF;
END $$;
DROP TABLE public.egg_credit_operations_v2;
DROP TABLE public.egg_credit_wallets_v2;
COMMIT;
