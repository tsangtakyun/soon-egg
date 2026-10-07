# Workspace trial Preview implementation checkpoint

## Superseding checkpoint — 2026-10-07

Subsequent UI acceptance is recorded in credits-trial-approval.md. Its minimal
pending DDL/policy bundle adds durable one-time trial enrollment and isolated
PostgreSQL constraint/grant/rollback verification. No deployed code changed.

The historical checkpoint below is retained for provenance, not current status.
Paid route inventory is now complete for this repository: 22 route files plus
subtitle proxy and hidden provider/autofill/recommendation paths fail closed.
Full clean remote Next build passed, including generated route TypeScript checks.
Existing-project Preview is Ready at deployed code SHA 1dd7806. Live policy 200
and unauthenticated generation 401 checks passed. Landing specifications and
credits login redirect were checked in the browser. Authenticated 503 and
read/edit/export remain NOT TESTED; no EGG session available. App source/typecheck
passed at bcc7fb1, but binary/build/install/device verification remain NOT DONE.
See credits-preview-verification-2026-10-07.md and credits-paid-route-inventory.md.
This is a generation-closed specification Preview, not an active durable trial.

## Historical source-only checkpoint

This is source work, not a production activation or a successful iPhone install.

- Shared policy: 7-day no-card / configurable 30-credit trial, provisional and
  inactive. Existing free user rights unchanged; trial/free relationship pending.
- Seven workflow prices: chat/short reply 1, script/full reply 3,
  EggThis/image reply 5, subtitle ceil verified media minutes ×3 (includes transcription).
  Legacy reply/transcribe/refine entries are deliberately unpriced: internal steps
  must not each charge a composite workflow.
- Public API reports workspace wallet `not_configured`, charging/purchase false.
- Removed the superseded Master user-wallet RPC adapter. An accidentally enabled
  EGG_CREDIT_V2_ENABLED flag returns 503, not a legacy reservation.
- Explicit EGG_TRIAL_PREVIEW=true admission gate applies only to Vercel Preview
  or local test/development. Added after authentication to chat, script, EggThis,
  Web/full mobile/short replies, subtitle generation, mobile audio transcription
  and paid subtitle proxy paths. Existing read/status/edit/export operations remain.
- This gate is NOT a durable quota and is NOT enabled on production. Other paid
  routes (topics, onboarding, media kit, brand matching, EggThis upstream analysis)
  still require a complete admission inventory before claiming an entire Preview
  is safe for public trial. Do not deploy or enable trial on that claim yet.
- Local pure model covers workspace isolation, idempotency conflicts, finite trial,
  exact expiry, unknown 15-minute refund, no timer postponement, late delivery,
  expired/cross-period reversal and prototype-safe request keys. No DB/network.
- Route unit test executes chat handler with auth/provider mocks: unauthenticated
  401 and authenticated unconfigured 503 before limiter/provider callback.
  This is NOT a live 401/429/503 or real concurrent PostgreSQL test.
- Web original-source TypeScript check uses tsconfig.credits-check.json because
  normal tsc stalled reading a duplicated generated .next/types/validator 2.ts.
  It does not replace Next build-generated route validation or a release build.
- App clean Preview source adds a server-policy screen (hidden from bottom NAV),
  refuses stale policy, blocks EGG use of legacy user_credits/direct provider
  fallback paths. SOON Log behavior unchanged. No build/install/device test.

Remaining: full paid-route limiter/admission coverage, persistent workspace wallet
and trial approval/application, real role/concurrency/media-duration verification,
Preview deployment/runtime/browser evidence, App exact-Preview API configuration,
release and phone verification (separate authorization required).
