# Safe Credits Preview — final evidence, 2026-10-07

## Web source and deployment

- Repository: `/Users/tommytsang/Desktop/SOON/egg-credits-preview`.
- Branch: codex/credits-preview.
- Deployed code SHA: `1dd780638c44d6b686d4cac46b02ed22d5a4a1e0`.
- URL: https://soon-egg-soon-creator-network-codex-645lyhneb.vercel.app
- Deployment ID: `dpl_Hd6wLYwHLTiL23pc6uK1qApmhMTX`.
- Existing project: soon-egg-soon-creator-network-codex;
  prj_hqQZox4G7hwVTC36mt67BHdS6lC2; target Preview; status Ready.
- Deployment-only flags: EGG_TRIAL_PREVIEW=true, EGG_CREDIT_V2_ENABLED=false,
  EGG_TRIAL_PREVIEW_CREDITS=30. No project-wide environment mutation.
- Forced clean remote build passed: dependency install, Next 16.3.4 compilation,
  complete TypeScript/generated route validation, 109 static pages, packaging.
  Inspector build duration 51 seconds. Source-only TypeScript pass is separate;
  local generated validator duplicate was preserved, not used as build evidence.
- No production deploy, DB migration apply, Stripe/payment changes, paid provider
  test or paid benchmark performed.

## Verification levels

| Check | Evidence | Result |
| --- | --- | --- |
| Public /api/credits/policy | live Vercel curl | 200; workspace-v2; wallet not_configured; trial inactive; charging/purchase false |
| POST /api/soon-ai/chat, empty JSON, no EGG session | live Vercel curl, repeated explicitly | 401 |
| POST /api/tools/script/generate, empty JSON, no EGG session | live Vercel curl | 401 |
| POST /api/onboarding/analyze, empty JSON, no EGG session | live Vercel curl | 401 |
| Public landing | live in-app browser DOM | inactive banner; provisional 7-day/30-credit no-card trial; HK$98/month/150 workspace credits; 1/3/5 and subtitle minute pricing |
| Landing specification link | live browser click | /login?next=%2Fcredits; no EGG session available |
| Authenticated generation blocking | actual chat handler with mocked auth/provider | 503 before limiter/provider; callback zero; NOT live authenticated evidence |
| Provider SDK blocking | local mocked factory | returns null before SDK construction; constructor zero |
| Full route coverage | static source assertions | 22 route files + subtitle proxy; not runtime proof for every route |
| Quota/expiry/refunds/isolation | pure local model | PASS; no real DB/provider/network |
| Rate limiter | mocked adapter | PASS, concurrent mock requests and DB error; not live 429 or PostgreSQL atomicity |
| Authenticated read/manual edit/export | source boundaries retained | runtime NOT TESTED; requires EGG session |
| Durable real trial/wallet | unapplied proposal | NOT ACTIVE / NOT TESTED |

Tests passed: credits-policy.cjs, credits-preview-model.cjs,
credits-preview-admission.cjs, soon-ai-rate-limit-mock.cjs, source TypeScript,
changed-file ESLint (zero errors; one pre-existing unused import warning),
git diff --check, full clean remote Next build.

Generation is closed until durable workspace wallet/trial admission exists.
Hidden external autofill on cover repair and Core production recommendation are
also blocked. Read dependency upstream internals were not audited. See the
complete covered/retained/remaining matrix in credits-paid-route-inventory.md.

## App source, build, install, device — separate

- Repository: `/Users/tommytsang/Desktop/SOON/egg-credits-ios-preview`.
- Branch: codex/credits-preview-ios.
- SHA: `bcc7fb1fdc5a3d8184764fdd48d14dd355de0c26`.
- Source and TypeScript: PASS.
- More → 創作工具 → Credits 規格預覽 is an ordinary-user menu, not owner/admin
  gated. Route creator/credits is hidden from bottom NAV with href:null.
  These are source checks; device visibility has NOT been tested.
- Screen reads shared server policy, rejects stale/non-workspace trial policy.
  EGG legacy user_credits/direct paid AI fallback guarded; SOON Log unchanged.
  Dirty latest EggThis App source preserved, not merged/released.
- Future authorized build: set EXPO_PUBLIC_EGG_API_URL to exact Preview URL above.
  Production default was not changed to an ephemeral Preview.
- Binary build/release/install: NOT DONE. Physical phone and App ordinary-user
  screen/read-edit-export: NOT TESTED.

## Remaining approval and work

1. Confirm provisional 30 credits / 7 days and relationship to permanent free
   rights before real activation. Current Preview explicitly inactive.
2. Approve reviewed staging-only workspace wallet/trial schema and mutation RPC
   implementation/test scope, including payer/roles. SQL proposals not applied;
   durable trial RPCs, generalized limiter, server media probing, real DB
   concurrency, period/replay/refund and role tests remain.
3. Normal authenticated EGG test login is needed for live 503/read-edit-export.
   No credential/cookie extraction attempted.
4. App release/build/install needs separate authorization after API validation.

This report does not claim public trial activation or production readiness.
