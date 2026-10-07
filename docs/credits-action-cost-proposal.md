# EGG action cost proposal — 2026-10-07

Approval proposal only; no additional charging action is enabled. Confirmed:
Creator HK$98/month; Free 30/month; Creator 150/month; SOON AI 1, script 3,
EggThis 5. Other prices need Tommy's confirmation. Rule: minimum 1 credit,
otherwise `ceil(estimated supplier HKD / 0.2)`. This is an approximate cost
budget rule, not a promise of cash redemption or actual invoice cost.

## Evidence and assumptions

The existing [read-only audit](/Users/tommytsang/Desktop/SOON/audits/2026-10-06-egg-real-cost-audit.md)
has one token-backed EggThis final-pack sample: input 13,391/output 903.
At Sonnet list price it is USD0.053718/HK$0.4215; no actual invoice exists.
`ceil(0.4215/0.2)=3` covers that one call only. Confirmed EggThis 5 stays fixed;
upstream understanding/research/vision calls and failures were not fully measured.
Reply's 56 completed jobs and script's 33 saved rows are activity counts, not
provider cost samples. No new benchmark or paid generation was run.

Official prices checked 2026-10-07:

- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing):
  Sonnet 4/4.6 USD3/input MTok and USD15/output MTok, global non-batch.
  Cache write/read and tool use must be added when actually used.
- [fal Wizper](https://fal.ai/models/fal-ai/wizper) currently displays USD0 per
  **compute second**. This is not billed audio-minute evidence. Actual account
  price, compute seconds/audio-minute ratio, and fal invoice are unknown.

HKD calculations below use the audit's USD/HKD7.847 reference (2026-09-30),
not a new live FX measurement or bank settlement. All rows except the EggThis
sample are hypothetical token scenarios. They are neither averages nor p90s.
Requested models are source defaults; runtime override/returned model must be
verified from telemetry before applying those prices. `max_tokens` is only a
configured cap; it is never presented as observed output.

## Suggested additional actions

Assumed uncached input/output tokens include system prompt, history, schema and
optional image tokens. Fixed launch suggestions use the upper planning scenario;
they require enforcing/reviewing those scenario bounds before activation.

| Action | Actual billed sample | Hypothetical input/output | Estimated HKD | ceil suggestion | Source/limit |
| --- | --- | --- | --- | --- | --- |
| Mobile short reply draft, text | None | 3,000/900 | 0.1766 | 1/draft | `/api/mobile/reply/draft`, output cap900 |
| Reply Centre full reply + brief, text | None | 6,000/3,500 | 0.5532 | 3/generation | `/api/tools/reply/chat`, cap3500; history may exceed assumption |
| Reply Centre with screenshot | None | 10,000/3,500 including 4,000 hypothetical image tokens | 0.6474 | 4/generation | same route; bytes/image count are not token measurements |
| Reply long-history stress case | None | 20,000/3,500 | 0.8828 | 5/generation | planning stress case, not normal observed usage |
| Document enhancement | None | 2,000/2,000 | 0.2825 | 2/generation | `/api/tools/docs/enhance`; input currently unbounded |
| Media Kit copy | None | 2,000/1,000 | 0.1648 | 1/generation | `/api/media-kit/generate`, cap1000 |
| Brand pitch | None | 2,000/800 | 0.1412 | 1/generation | `generate-pitch.ts`, cap800 |
| Brand matching, one batch | None | 8,000/2,000 | 0.4237 | 3/batch | `match-brands.ts`; brand list size changes input |
| Profile bio suggestions, 3 variants | None | 5,000/700 | 0.2001 | 2/batch | `/api/profile/bio-suggestions`, cap700 |
| Creator profile analysis | None | 4,000/1,000 | 0.2119 | 2/generation | `analyze-creator.ts`, cap1000 |
| DNA preference suggestion | None | 1,000/300 | 0.0589 | 1/generation | `/api/egg/dna-rules/suggest`; retry can add cost |
| EGG command/idea planning | None | 10,000/4,000 | 0.7062 | 4/generation | `/api/egg/command`, cap4000; downstream calls separate |

Recommendation: distinguish short draft1, full reply3, screenshot reply4 only
if the UI/API distinguish the actions and enforce context limits. Otherwise
keep reply unpriced until one fixed full-workflow charge is approved. Do not
silently switch a user between 1 and 5 depending on hidden model token usage.
Automatic topic enrichment/geography retries should be included in the owning
saved-topic action or treated as internal cost; charging each background retry
would require a separate explicit product decision.

## Subtitle per-minute proposal

Source inspected: `soon-subtitle/app/api/transcribe/route.ts` uses
`fal-ai/wizper`; `lib/refine.ts` sends 5 lines per batch; `lib/claude.ts` repeats
the long refinement prompt each batch (cap4096). SDK retries plus per-line
fallback after batch failure can add calls. There is no reliable invoice/token
sample for the composite workflow.

| One audio-minute scenario | Hypothetical refine calls | Refine-only HKD | Total supplier HKD | Proposed credits |
| --- | --- | --- | --- | --- |
| 12 lines, no retries | 3 calls, each6,000 input/400 output | 0.5650 | `0.5650 + F` | `max(1,ceil((0.5650+F)/0.2))`; 3 only if F is confirmed zero |
| 24 lines, no retries | 5 calls, same hypothetical tokens | 0.9416 | `0.9416 + F` | 5 only if F is confirmed zero |
| Retry/per-line recovery | Unknown extra calls/tokens | Unknown | Unknown | Cannot set an evidence-backed full-workflow number |

`F` is actual fal HKD per audio minute; it is presently unknown. Therefore
**3 credits/audio-minute is a provisional normal-case suggestion, not a confirmed
combined cost**; dense subtitles may require5. Keep both subtitle actions
unpriced until F, normal batch count and failure overhead are checked.
Suggested billing unit, if approved: `ceil(verified media_duration_seconds/60)`
times approved per-minute price, minimum1 minute, one composite generation
`call_id`. Verify duration from media metadata before reservation (not last
spoken timestamp, which undercounts silence). Refinement/resume of the same
generation uses the same call_id; internal retries do not charge again. A new
user-requested re-generation is a new operation with price shown first.

## Gaps before approval/activation

Collect passive normal-use metadata: returned model, tokens including image/cache,
all child calls, fal request ID, verified audio seconds, billed compute duration,
supplier invoice reference when available, terminal outcome. No paid benchmark
is required. Existing telemetry is asynchronous/fail-open; missing evidence
remains unknown. Supplier expenses on failed/cancelled requests stay recorded
even when user credits are refunded.
