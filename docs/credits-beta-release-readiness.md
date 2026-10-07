# EGG free Beta / seven-day trial readiness — read-only audit, 2026-10-07

No new flow/deployment was performed for this audit. Subsequent Preview-only
implementation is authorized separately; see its handoff for actual changes.

## Source vs actual production

Read-only Vercel inspection of egg.sooncreator.network resolves to
dpl_CaED14dzSK1rAUM5NGHK3fVEuCJx, READY production, created Sep30 22:38 BST.
Latest reviewed Preview is Oct7 7db9665 / dpl_2656SgS1gUZdmpegLWHeVaSHmEwh.
The recovered-source Oct7 d7b44e5/70020bf limiter commits are local/Preview work,
not proof of production coverage. Exact deployed Git SHA was not obtained.
Do not run unauthenticated paid endpoints to infer it. The recovered pre-limiter
22df377 SOON AI handler has no auth; release must verify deployed source and
all cost-bearing routes, not assume DB migration alone protects the site.

## Flags and route coverage in current Preview source

| Surface | Current control | Remaining gap |
| --- | --- | --- |
| SOON AI /api/soon-ai/chat | Verified session/bearer + workspace membership; persistent limiter; v2 flag false bypasses reserve/commit/refund | Real authenticated429/DB concurrency not tested; messages/input/history unbounded; limit env numeric validation needed |
| Script /api/tools/script/generate | Session/bearer + explicit membership; v2 reservation gated false | No persistent action/concurrency limit; inputs unbounded; new key per App call not retry-stable |
| EggThis final pack /api/egg/projects/[id]/generate | Auth/workspace/project checks; v2 reservation gated false | Upstream project/image/angle/style/research calls not covered by credit reserve or persistent limiter |
| Full reply Web/mobile and short draft | Auth/workspace; tracked Anthropic | No credit gate or persistent action limit; background job requestId is not full credit idempotency |
| Subtitle legacy SRT + service proxy | Web session auth; integration secret upstream | No composite duration pricing or durable action/concurrency limit; proxy doesn't validate workspace membership or media duration |
| Media Kit, brand match/pitch, docs, bio/DNA, onboarding, topic share/repair, daily/command | Local handlers have auth/secret checks for reviewed paths; many raw provider calls | No shared durable limit; max_tokens is not spend cap; background retries and GET-triggered generation require audit |
| Cron geography | CRON_SECRET, bounded batch3 and retry budget | Not a global spend cap; provider/search cost still incurred |

Only consumeSoonAiRateLimit uses the persistent counter in this source. Actual
counter PK is (workspace,user,feature,window_kind,window_start), so “5/min30/day”
is per user **within a workspace**, not one cross-workspace global allowance.
Many members/workspaces/accounts multiply exposure. Limiter errors fail closed
503 before provider in guarded chat; telemetry fails open intentionally and is
not an admission/budget control. Fail-closed limit must cover every paid boundary,
including child APIs, retry workers, external service and duplicate requests.

Web charging has two switches: legacy CREDIT_SYSTEM_ENABLED hardcoded false,
new EGG_CREDIT_V2_ENABLED strict true. They do not form one universal gate.
No v2 flag can safely activate the latest workspace design: old adapter still
targets Master/user RPC and paid subscription by user. Public policy declares
purchaseEnabled=false but that field alone does not control every payment path.

## Checkouts vs existing subscriptions / commerce

- /api/credits/checkout and /subscribe authenticate then reject409 before Stripe
  when legacy flag false. This blocks **new** old-package/subscription sessions.
- /api/credits/cancel remains active: ownership by user, Stripe cancel_at_period_end,
  local row immediately marked cancelled. Don't disable cancellation with a
  “no purchase” flag; period state deserves separate correction before paid phase.
- Canonical /api/webhooks/stripe and compatibility alias remain active and do
  not use credit flag. Legacy paid invoices add800/2500 to user_credits directly,
  old completed purchases add credits. No new workspace mapping; replay/increment
  is not atomic with event claim. Disabling checkout will not stop existing Stripe
  subscriptions from renewing or alter an already created checkout session.
- /api/stripe/checkout is creator **product commerce**, not EGG credits; /api/checkout
  saves product orders. Don't globally block Stripe/product checkout/webhooks.
- Beta wording must not imply an existing paid subscription was cancelled/free.
  Current subscribers need a separate consent/transition plan; no auto refund,
  cancellation, repricing or converting them to trial is authorized.

## App audit — source only, no installed-binary claim

Clean iOS Preview bda6d50: EGG script branches to shared Web API and loads policy;
but generic tools/soon-ai still calls soon-core API, falls back to direct
Anthropic with EXPO_PUBLIC_ANTHROPIC_KEY if present, and uses client read-update
user_credits. Not proof the key is configured; never ship that fallback in EGG.
The tool file lacks an EGG mode guard; hidden tab href:null is not an access guard.
Generic script branch still updates old credits, while EGG script avoids it.
Menu/home/getCredits use old real balance, not Beta estimate. SOON Log and EGG
must be distinguished; do not relabel a different product's wallet.

Dirty primary soon-idea-ios has newer EGG routes not in clean Preview; preserve
user work and compare/include deliberately. API default points at production,
so an App Preview must explicitly target tested Preview and never silently fall
back to production on policy/limit failure. No release build/install/device test.

## Public signup and cost abuse

Web signup directly calls Supabase Auth email/Google. UI handles confirmation
email or immediate session; actual Supabase email confirmation, CAPTCHA, signup
limits, OAuth settings and email deliverability have not been inspected/verified.
Optional email/IP login draft is disabled/out of scope, and would not protect
direct Auth signup or paid generation anyway. API handlers—not page middleware—
must enforce membership and paid-boundary limits. Signup farm can multiply
per-account trial allowance; user-editable created_at/metadata cannot grant trial.

No global monetary cap/kill switch was found. Even durable per-user limits do
not bound total spend across accounts/workspaces, token sizes, images, media
minutes, search calls or SDK retries. For unrestricted public signup either add
server global/concurrency/weighted limits with alert/kill switch, or explicitly
scope admission/invite-only until safe controls exist. Limit thresholds/budget
must be configurable, not quietly invented commercial quotas. Provider dashboard
alerts alone are not proven real-time hard caps. No paid benchmark is required.

## Estimate and trial separation

Free Beta cost estimates can be shown without paid wallet: “本次預計使用5
AI Credits；Beta期間不扣除”. Never reduce real balances or block solely because
an estimate reaches zero. Display units/rules, not a fabricated available wallet.

New direction: seven-day/no-card trial, provisional30 configurable trial credits.
This is **not unlimited free Beta**. Requires server-owned cohort/start/end and
durable trial ledger/idempotency, separate from old balances and monthly wallet.
Expired/depleted new-trial accounts may read/edit/download but cannot generate.
Existing production users retain their rights. Trial vs permanent free30/month
needs Tommy's decision before public promises. No trial start based only on client
metadata; refresh/reinstall/new workspace must not reset an existing trial grant.
An in-memory/mock counter is acceptable only for explicitly labelled Preview
simulation, never genuine public quota enforcement.

## Necessary vs deferrable and indicative effort

Assumes one owner, existing shared DB/access, no paid provider tests, no unrelated
UX changes. Ranges are engineering estimates, not delivery guarantees.

| Stage | Necessary before release | Indicative workdays |
| --- | --- | --- |
| Preview-only mock trial | Updated policy/copy Web/App, isolated simulation/no provider, local lifecycle/concurrency tests, known-blocker display | 0.5–1.5 |
| Public free Beta, no durable trial | All cost endpoints auth + persistent weighted/rate/concurrency limits/failclosed; input/media bounds; deploy exact reviewed source; no-purchase + existing-payment regression; App safe routing; no real-wallet edits | 3–5, plus App release/device window |
| Public7-day finite trial | Approved cohort/free relationship; approved trial DDL/RPC; durable atomic admission/refund/expiry across Web/App; signup abuse controls; provider boundary tests | Additional2–4; approvals/access can extend |
| Formal paid workspace wallet | Approved wallet/billing roles/handoff/transition; Stripe workspace mapping/webhook transaction/generation; media metadata; unknown worker; concurrency/grants/refund/rollover tests | Additional4–7; Stripe/iOS approvals separate |

Can defer paid wallet/Stripe sales/credit-pack migration, paid cost benchmarks,
rich usage charts, billing delegation and visual polish. Cannot defer auth,
durable finite-trial enforcement, no-purchase backend controls, known data-scope
leaks, no secret-bearing client fallback, abuse protections, or honest copy.
Existing monthly free policy must not be removed to simplify a deadline.

## Proposed production Chinese copy (no Preview wording)

Free Beta route, if selected: “Beta期間免費使用，暫不扣除AI Credits，也不開放
購買。各項功能設有使用上限。” / “本次預計使用5 AI Credits；Beta期間不扣除。”

Seven-day route, after policy/persistence approval: “免費試用7日，毋須信用卡。”
/ “試用額度：30 AI Credits，有效至{香港時間日期}。” / “試用期已結束。你仍可
查看、編輯及下載已有內容；新生成暫未開放。” / “本次使用3 AI Credits。”
Do not claim a real debit until trial ledger is active.30 is provisional until
Tommy approves amount. Add “目前暫不開放付款” if upgrade payment is disabled.

Creator future paid: “HK$98／月，包含150 AI Credits。按訂閱週期重置，未用額度
不累積。” Don't keep the existing annual HK78 toggle as an approved new offer.
Failure: “生成失敗，已退回本次額度。” Cross period: “本次扣數已撤回；原週期
額度已到期，不會加入新週期。” Unknown: “仍在確認生成結果，請勿重複提交。
15分鐘內未能確認會退回額度；稍後取得結果仍會交給你，不再扣除。”

## Required evidence before public launch

Exact deployed SHA/flags; authenticated429 + limiter-backend503 provider-zero;
workspace spoof/removal negative tests; nonchat/child/GET/cron/external-service
coverage; simultaneous trial requests and expiry boundary in actual DB; no wallet
mutations during free Beta; old subscriptions/webhooks/product commerce regressions;
input/media/time bounds; signup settings/cohort/captcha decision; published privacy
and trial terms; Web/App UI acceptance, release build/install/device verification.
All live provider paid tests, real-wallet concurrency and device behavior remain
NOT TESTED in this read-only audit. No secrets, Stripe or production settings changed.
