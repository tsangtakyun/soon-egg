-- DESIGN ONLY / NOT APPLIED. Run target would be EGG Supabase, not Master.
-- Full replacement for ALL earlier un-applied wallet drafts; absent tables only.
-- Trial/free relationship and eligibility below are recommendations awaiting approval.
-- No RPC, worker, Stripe mutation, or charging activation is included.
BEGIN;
CREATE TABLE public.egg_credit_wallets_v2 (
  workspace_id uuid PRIMARY KEY REFERENCES public.egg_creator_profiles(id),
  payer_user_id uuid REFERENCES auth.users(id),
  billing_subscription_id text UNIQUE,
  billing_generation uuid NOT NULL,
  current_period_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One immutable enrollment per workspace and per verified owner account.
-- Eligibility/owner membership/rollout cohort must be verified by future RPC.
-- Joining teams, re-opening the app or changing owner must not refill a trial.
CREATE TABLE public.egg_credit_trials_v2 (
  workspace_id uuid PRIMARY KEY REFERENCES public.egg_credit_wallets_v2(workspace_id),
  eligibility_owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 200),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  allowance integer NOT NULL CHECK (allowance BETWEEN 1 AND 150),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, starts_at, expires_at, allowance),
  CHECK (isfinite(starts_at) AND isfinite(expires_at)),
  CHECK (expires_at = starts_at + interval '168 hours')
);
-- Retain period snapshots; never delete them on reset, payer transfer or leave.
CREATE TABLE public.egg_credit_periods_v2 (
  workspace_id uuid NOT NULL REFERENCES public.egg_credit_wallets_v2(workspace_id),
  period_key text NOT NULL CHECK (length(period_key) BETWEEN 1 AND 200),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  plan text NOT NULL CHECK (plan IN ('free', 'creator', 'trial')),
  trial_workspace_id uuid UNIQUE,
  allowance integer NOT NULL,
  available integer NOT NULL,
  payer_user_id uuid REFERENCES auth.users(id),
  billing_generation uuid NOT NULL,
  billing_subscription_id text,
  stripe_invoice_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, period_key),
  CHECK (period_end > period_start),
  CHECK ((plan = 'free' AND allowance = 30)
    OR (plan = 'creator' AND allowance = 150)
    OR (plan = 'trial' AND allowance BETWEEN 1 AND 150)),
  CHECK ((plan = 'trial' AND trial_workspace_id IS NOT NULL AND trial_workspace_id = workspace_id
      AND payer_user_id IS NULL AND billing_subscription_id IS NULL AND stripe_invoice_id IS NULL)
    OR (plan <> 'trial' AND trial_workspace_id IS NULL)),
  FOREIGN KEY (trial_workspace_id, period_start, period_end, allowance)
    REFERENCES public.egg_credit_trials_v2(workspace_id, starts_at, expires_at, allowance),
  CHECK (available BETWEEN 0 AND allowance),
  CHECK (plan <> 'creator' OR (payer_user_id IS NOT NULL AND billing_subscription_id IS NOT NULL AND stripe_invoice_id IS NOT NULL))
);
CREATE UNIQUE INDEX egg_credit_periods_v2_subscription_start
  ON public.egg_credit_periods_v2(billing_subscription_id, period_start)
  WHERE billing_subscription_id IS NOT NULL;
ALTER TABLE public.egg_credit_wallets_v2 ADD CONSTRAINT egg_credit_wallets_v2_current_period
  FOREIGN KEY (workspace_id, current_period_key)
  REFERENCES public.egg_credit_periods_v2(workspace_id, period_key);
CREATE TABLE public.egg_credit_operations_v2 (
  call_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.egg_credit_wallets_v2(workspace_id),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  action text NOT NULL CHECK (action IN ('soon_ai_chat','reply_short','script_generate','reply_full','egg_this_generate','reply_image','subtitle_generate')),
  amount integer NOT NULL,
  reserved_period_key text NOT NULL,
  media_duration_seconds numeric(12,3),
  media_sha256 text,
  duration_source text CHECK (duration_source IN ('server_probe','trusted_provider_metadata')),
  billable_minutes integer GENERATED ALWAYS AS
    (CASE WHEN action = 'subtitle_generate' THEN greatest(1, ceil(media_duration_seconds / 60)::integer) ELSE NULL END) STORED,
  credit_status text NOT NULL DEFAULT 'reserved'
    CHECK (credit_status IN ('reserved','committed','refunded')),
  provider_status text NOT NULL DEFAULT 'not_started'
    CHECK (provider_status IN ('not_started','dispatching','succeeded','failed','cancelled','unknown')),
  unknown_since timestamptz,
  refund_due_at timestamptz,
  refund_restored integer NOT NULL DEFAULT 0,
  refund_expired integer NOT NULL DEFAULT 0,
  refund_reason text,
  refunded_at timestamptz,
  result_reference text,
  result_saved_at timestamptz,
  dispatch_claim uuid,
  reconcile_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, idempotency_key),
  FOREIGN KEY (workspace_id, reserved_period_key)
    REFERENCES public.egg_credit_periods_v2(workspace_id, period_key),
  CHECK (action <> 'subtitle_generate' OR
    (media_duration_seconds IS NOT NULL AND media_duration_seconds > 0 AND media_duration_seconds <> 'NaN'::numeric
      AND media_sha256 IS NOT NULL AND media_sha256 ~ '^[0-9a-f]{64}$' AND duration_source IS NOT NULL)),
  CHECK (amount = CASE
    WHEN action IN ('soon_ai_chat','reply_short') THEN 1
    WHEN action IN ('script_generate','reply_full') THEN 3
    WHEN action IN ('egg_this_generate','reply_image') THEN 5
    WHEN action = 'subtitle_generate' THEN 3 * billable_minutes END),
  CHECK (refund_restored >= 0 AND refund_expired >= 0),
  CHECK ((credit_status = 'refunded' AND refund_restored + refund_expired = amount AND refunded_at IS NOT NULL)
      OR (credit_status <> 'refunded' AND refund_restored = 0 AND refund_expired = 0 AND refunded_at IS NULL)),
  CHECK (provider_status <> 'unknown' OR (unknown_since IS NOT NULL AND refund_due_at IS NOT NULL)),
  CHECK (refund_due_at IS NULL OR (unknown_since IS NOT NULL AND refund_due_at = unknown_since + interval '15 minutes')),
  CHECK (credit_status <> 'committed' OR (provider_status = 'succeeded' AND result_reference IS NOT NULL AND result_saved_at IS NOT NULL))
);
CREATE INDEX egg_credit_operations_v2_reconcile
  ON public.egg_credit_operations_v2(reconcile_after)
  WHERE credit_status = 'reserved' AND provider_status IN ('dispatching','unknown');
CREATE INDEX egg_credit_operations_v2_refund_due
  ON public.egg_credit_operations_v2(refund_due_at)
  WHERE credit_status = 'reserved' AND provider_status = 'unknown';
ALTER TABLE public.egg_credit_trials_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.egg_credit_trials_v2 FROM PUBLIC, anon, authenticated, service_role;
-- Enrollment is insert-only for service_role; owner/grant/time snapshots cannot be updated.
GRANT SELECT, INSERT ON public.egg_credit_trials_v2 TO service_role;
ALTER TABLE public.egg_credit_wallets_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_credit_periods_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_credit_operations_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.egg_credit_wallets_v2, public.egg_credit_periods_v2, public.egg_credit_operations_v2 FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.egg_credit_wallets_v2, public.egg_credit_periods_v2, public.egg_credit_operations_v2 TO service_role;
-- Preserve grant and operation identity; future atomic RPCs update only state.
GRANT UPDATE (payer_user_id, billing_subscription_id, billing_generation, current_period_key, updated_at)
  ON public.egg_credit_wallets_v2 TO service_role;
GRANT UPDATE (available, updated_at) ON public.egg_credit_periods_v2 TO service_role;
GRANT UPDATE (credit_status, provider_status, unknown_since, refund_due_at,
  refund_restored, refund_expired, refund_reason, refunded_at, result_reference,
  result_saved_at, dispatch_claim, reconcile_after, updated_at)
  ON public.egg_credit_operations_v2 TO service_role;
-- No cascading deletion, public reads or client writes. Auth/membership and
-- terminal state transitions remain server/RPC duties, not DDL guarantees.
COMMIT;
