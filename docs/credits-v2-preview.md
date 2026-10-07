# EGG Credits — current deployment vs latest approved design

## Latest decisions (design only until integration)

Creator HK$98/month/150 credits; free30/month resets Asia/Hong_Kong on the first,
no accumulation. Wallet belongs to creator workspace, payer_user_id separate.
Light1 conversation/short reply; standard3 script/full reply; heavy5 EggThis/
image or screenshot reply. Subtitle3 per rounded-up minute, includes transcription.
Unknown15min refund, no redispatch, late result delivered with no re-debit;
cross-period reversal only, no new-period credits.

Current migration for review:
docs/migrations/20261007180000_egg_workspace_wallet_proposal.sql and matching
.rollback.sql. Design: docs/credits-wallet-approval-design.md.
Exact comparison: docs/credits-wallet-latest.diff and docs/credits-wallet-revision.md.
Older 121000/160000 drafts are superseded, never applied and must not be enabled.

## Current deployed Preview (7db9665) — not this design's implementation

The public API /api/credits/policy still advertises timezoneConfirmed=false,
reply/subtitle unpriced. EGG_CREDIT_V2_ENABLED defaults false; old Master/user
RPC adapter is incompatible with workspace design. Legacy CREDIT_SYSTEM_ENABLED
is hardcoded false. No live wallet reservation/refund/period synchronization.

Legacy purchased balances, Basic/Pro 800/2500, welcome300 and Stripe IDs are
unchanged. Purchased credit expiry/consumption is not decided by the new monthly
wallet design; do not present any old proposal as confirmed purchased-credit policy.
The canonical product webhook independently updates old balances; disabling
checkout does not disable existing subscriptions or product commerce.

## New seven-day Preview work

Latest five-hour instruction authorizes Preview code/mocks, not unapproved DDL.
Trial30 credits/7days/no card is configurable and explicitly provisional.
Relationship to permanent free30/month is unresolved. Trial expiry blocks new
generation but retains read/edit/download in the proposed new-trial cohort;
never retroactively change existing production users' entitlements.

No real quota persistence may be claimed from mock tests. Unconfigured required
trial/quota backend must fail closed before provider calls. Free Beta estimates
and mock trial reservations are distinct from real wallet balances; existing
legacy balances must never be rewritten for these previews.

See credits-beta-release-readiness.md for read-only safety gaps. Production
activation, DB apply, payments and iOS release/install remain approval gates.

## Optional login hardening remains outside scope

Email/IP password-login draft and EGG_LOGIN_RATE_LIMIT_ENABLED remain disabled
and un-applied. Existing authenticated AI limiter is in scope; do not broaden
this into login-form work. Telemetry remains async/fail-open, while abuse and
credit admission must be fail-closed.

## Verification truthfulness

Static SQL checks/mock concurrency do not prove database atomicity, genuine
authenticated429, App release or device behavior. No paid benchmark/provider
test is authorized. Tommy performs UI acceptance.
