# EGG Credits v2 — Preview gate

This work is Preview-only. The legacy `CREDIT_SYSTEM_ENABLED` remains `false`;
checkout, Stripe, Production and existing balances are unchanged.

## Proposed entitlement/reset policy (awaiting product confirmation)

- Free grant amount is 30. Proposed reset: Hong Kong calendar month. Boundaries are
  calculated in `Asia/Hong_Kong` and stored as UTC timestamps.
- Creator grant amount is 150. Proposed reset: exact active Stripe subscription billing
  cycle. No active subscription row means no Creator entitlement; the server
  must not infer a paid plan from client input.
- Purchased credits, if re-enabled later, are separate from included credits,
  never expire at a monthly reset, and are consumed only after included credit.
- Canonical server actions: `soon_ai_chat` = 1, `script_generate` = 3,
  `egg_this_generate` = 5.
- Legacy iOS `ai_generate` is not a price. A caller must provide a feature and
  the server resolves it through the same canonical action table.
- `reply_generate` has separate text/optional-image usage evidence. Subtitle
  transcription has fal/media-duration cost while subtitle refinement has
  Anthropic text cost. Both remain unpriced until measured usage supports a
  stable charge; they must not inherit a generic 10-credit price.

The public read-only contract is `GET /api/credits/policy`. Mutation routes do
not accept a caller-provided cost.

## Charge lifecycle

1. Validate the authenticated user, workspace membership and request payload.
2. Require an `Idempotency-Key` for a chargeable request.
3. Atomically reserve the server-defined amount before a paid provider call.
4. A duplicate/in-flight/previously completed key never starts another provider
   call.
5. Commit only after provider output and required product records are saved.
6. Provider, validation-after-reserve, or required-save failure calls the
   idempotent refund RPC.

The reviewed Master Supabase migration is required before enabling
`EGG_CREDIT_V2_ENABLED=true`. Until then the new integration is a no-op and
reports zero deducted credits, preserving current free behaviour.

## Reset provisioning

The wallet reset is intentionally not guessed inside the debit RPC. Before an
enabled debit, a server-only entitlement provisioner must upsert the verified
period:

- Free: first instant of current/next HK calendar month.
- Creator: `egg_subscriptions.current_period_start/current_period_end` for an
  active subscription.

The Master database RPC rejects expired/unprovisioned wallet periods. This
prevents a stale paid plan or client-supplied period from silently granting
credit.

## Optional login hardening (out of current approved scope)

The draft password-login limiter applies both 5 attempts
per HMACed email per minute and 30 attempts per HMACed IP per hour, stores no
raw email/IP, returns `429` with `Retry-After`, and fails closed if the limiter
backend is unavailable. `EGG_LOGIN_RATE_LIMIT_ENABLED` remains false until the
migration is separately approved; `EGG_LOGIN_RATE_LIMIT_PEPPER` is a dedicated
server secret. This draft migration is not required for credits Preview review
and is not part of the approved SOON AI per-user minute/day limit.

## Release gates

- Do not apply either migration without explicit approval.
- Do not set either new flag in Production.
- Do not modify Stripe or publish an iOS/TestFlight release.
- Credits Preview acceptance must cover mobile/web auth, duplicate
  idempotency, concurrent debit, insufficient credit, provider failure refund,
  required-save failure refund, confirmed period boundaries and telemetry
  fail-open. Login-form limiting requires separate scope approval.
