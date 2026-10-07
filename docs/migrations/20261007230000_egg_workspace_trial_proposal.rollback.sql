-- DESIGN ONLY / NOT APPLIED. Stop/drain runtime and workers first.
-- Financial/enrollment rows must be retained; refuse rollback after any use.
BEGIN;
LOCK TABLE public.egg_credit_wallets_v2, public.egg_credit_trials_v2,
  public.egg_credit_periods_v2, public.egg_credit_operations_v2 IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.egg_credit_operations_v2)
     OR EXISTS (SELECT 1 FROM public.egg_credit_periods_v2)
     OR EXISTS (SELECT 1 FROM public.egg_credit_trials_v2)
     OR EXISTS (SELECT 1 FROM public.egg_credit_wallets_v2) THEN
    RAISE EXCEPTION 'Wallet or trial history exists: preserve records; runtime-only rollback required';
  END IF;
END $$;
ALTER TABLE public.egg_credit_wallets_v2 DROP CONSTRAINT egg_credit_wallets_v2_current_period;
DROP TABLE public.egg_credit_operations_v2;
DROP TABLE public.egg_credit_periods_v2;
DROP TABLE public.egg_credit_trials_v2;
DROP TABLE public.egg_credit_wallets_v2;
COMMIT;
