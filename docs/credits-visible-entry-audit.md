# Credits Preview visible-entry audit — 2026-10-07

The Preview specification is Free 30/month, Creator 150/month; SOON AI 1,
script 3, EggThis 5 per generation. Deduction and purchase are disabled.
No existing balance, Stripe price, subscription, or database row was changed.

| Entry | Result |
| --- | --- |
| Public pricing | Free 30/day corrected to 30/month; Creator 150/month added; both marked Preview |
| `/credits` | Displays 30/150 and 1/3/5, with deduction/purchase disabled; no fake balance |
| Tools hub | SOON AI 10 corrected to 1; script 3; shared no-deduction notice |
| Sidebar/tool header badge | Credits Preview, deduction not enabled |
| SOON AI panel and tool page | 1 Credit Preview, deduction not enabled |
| Script workspace | 3 Credits Preview, deduction not enabled |
| Subtitle workspace | Unpriced, Preview does not deduct; media cost under evaluation |
| Legacy finance and idea workspace headers | Old balance display hidden; Preview status shown |
| Reusable CreditBalance | Removed hard-coded 0 balance; Preview status shown |
| Legacy subscribe/checkout endpoints | Reject with 409 and explain purchase/deduction is not enabled |
| EggThis | Server canonical action is 5; `/credits` states the cost; existing screen has no price claim |

## Legacy mapping preserved

`CreditsClient.tsx` is not imported or rendered by any current page. It retains
Basic HK$68/800 monthly and Pro HK$168/2500 monthly, linked to their original
Stripe price IDs. These are legacy subscriptions, not Free/Creator included
monthly grants. The old checkout flag is false. One-off Starter 300/HK$38,
Growth 1000/HK$98, Creator Pack 2500/HK$198, Pro Pack 6000/HK$398 also remain
disabled and unchanged. Legacy welcome 300 and demo profile 300 are not new
monthly entitlements; no stored balances or grants were rewritten.

## Verification boundaries

Policy and TypeScript/build checks pass. The route uses the shared limiter guard;
mock denied and backend-failure paths invoke the provider callback zero times.
The concurrent mock gives 5 permits to 20 calls and invokes the provider callback
exactly 5 times. This is a mock guard test, not live DB atomicity or live HTTP 429.
Live authenticated 429 remains NOT TESTED. No paid provider call was made.

The iOS Preview branch aligns canonical actions and server policy retrieval.
The shared policy response includes `chargingEnabled`/`purchaseEnabled`; the
EGG script screen shows the server cost as Preview and explicitly says deduction
is not enabled when the server flag is off. Generic SOON Log wallet screens are
separate legacy surfaces and were not relabeled as EGG included entitlements.
The latest uncommitted EggThis screen exists only in the user's dirty main iOS
checkout, so that screen has not been merged into the clean Preview branch.
Release build, iPhone install, and device verification remain not performed.
