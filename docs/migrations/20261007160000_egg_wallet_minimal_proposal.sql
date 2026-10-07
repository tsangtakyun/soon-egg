-- SUPERSEDED by 20261007180000_egg_workspace_wallet_proposal.sql. DO NOT APPLY.
-- Prior user-wallet proposal preserved for exact comparison.
-- DESIGN ONLY. NOT APPLIED. Requires approval and the protocol in
-- docs/credits-wallet-approval-design.md. No public write policies or RPCs.
-- Supersedes the 121000 proposal; existing runtime RPCs are incompatible.
BEGIN;
CREATE TABLE public.egg_credit_wallets_v2 (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  plan text NOT NULL CHECK (plan IN ('free', 'creator')),
  period_key text NOT NULL CHECK (length(period_key) BETWEEN 1 AND 200),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  allowance integer NOT NULL,
  available integer NOT NULL,
  billing_subscription_id text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end > period_start),
  CHECK (allowance = CASE plan WHEN 'free' THEN 30 ELSE 150 END),
  CHECK (available BETWEEN 0 AND allowance),
  CHECK (plan <> 'creator' OR billing_subscription_id IS NOT NULL)
);
CREATE TABLE public.egg_credit_operations_v2 (
  call_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.egg_credit_wallets_v2(user_id),
  workspace_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  action text NOT NULL CHECK (action IN ('soon_ai_chat','script_generate','egg_this_generate')),
  amount integer NOT NULL,
  reserved_period_key text NOT NULL,
  reserved_period_start timestamptz NOT NULL,
  reserved_period_end timestamptz NOT NULL,
  credit_status text NOT NULL DEFAULT 'reserved'
    CHECK (credit_status IN ('reserved','committed','refunded')),
  provider_status text NOT NULL DEFAULT 'not_started'
    CHECK (provider_status IN ('not_started','dispatching','succeeded','failed','cancelled','unknown')),
  refund_restored integer NOT NULL DEFAULT 0,
  refund_expired integer NOT NULL DEFAULT 0,
  refund_reason text,
  result_reference text,
  dispatch_claim uuid,
  reconcile_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CHECK (reserved_period_end > reserved_period_start),
  CHECK (amount = CASE action WHEN 'soon_ai_chat' THEN 1 WHEN 'script_generate' THEN 3 ELSE 5 END),
  CHECK (refund_restored >= 0 AND refund_expired >= 0),
  CHECK ((credit_status = 'refunded' AND refund_restored + refund_expired = amount)
      OR (credit_status <> 'refunded' AND refund_restored = 0 AND refund_expired = 0)),
  CHECK (credit_status <> 'committed' OR (provider_status = 'succeeded' AND result_reference IS NOT NULL))
);
CREATE INDEX egg_credit_operations_v2_reconcile
  ON public.egg_credit_operations_v2(reconcile_after)
  WHERE credit_status = 'reserved' AND provider_status IN ('dispatching','unknown');
ALTER TABLE public.egg_credit_wallets_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_credit_operations_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.egg_credit_wallets_v2, public.egg_credit_operations_v2 FROM anon, authenticated;
-- Server/service-role only. RLS is not a substitute for server authorization.
COMMIT;
