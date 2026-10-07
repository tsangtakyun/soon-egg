# Paid entry inventory — gated Preview, not active trial

Scope: EGG Web repository source at this checkpoint. `EGG_TRIAL_PREVIEW=true`
only on the exact Preview deployment. With this gate, unconfigured generation
returns 503 after authentication, before provider work. Production is unchanged.

| Entry | Preview coverage | Retained no-generation boundary |
| --- | --- | --- |
| POST /api/soon-ai/chat | auth → gate → existing persistent limiter (not reached while gated) | none |
| POST /api/tools/script/generate | membership → gate | saved scripts/history separate routes |
| POST /api/egg/projects | auth/workspace → gate before URL/image analysis, research and angle calls | project list/detail separate routes |
| POST /api/egg/projects/[id]/generate | auth/workspace → gate before storage/pack creation and nested AI | pack manual edits separate routes |
| POST /api/egg/projects/[id]/styles | auth/workspace → gate; rankProduction helper defense | stored pack/style snapshots preserved |
| POST /api/egg/command | auth/workspace → gate before intent/search/final response | GET session history untouched |
| GET /api/egg/daily | auth, return stored current-day three recommendations; gate before new generation/refresh | existing recommendation read |
| POST /api/egg/dna-rules/suggest | auth/workspace → gate | rules confirmation/edit separate routes |
| POST /api/media-kit/generate | auth/workspace ownership → gate | existing media kit read/edit |
| POST /api/brands/match | auth/workspace ownership → gate | stored deals read |
| POST /api/brands/pitch | auth/workspace → gate | stored content read |
| POST /api/profile/bio-suggestions | auth → gate | profile manual edit |
| POST /api/onboarding/analyze | newly enforced auth/workspace → gate before external metadata/AI | manual onboarding save remains separate |
| POST /api/tools/docs/enhance | auth → gate before legacy zero-cost deduction/AI | docs save/read/delete separate routes |
| POST /api/tools/reply/chat | auth/workspace → gate before job/provider creation | GET job status/history untouched |
| POST /api/mobile/reply start_chat / generated chat | auth/workspace → gate before async job/AI | create/rename/delete/status/job_status branches retained |
| POST /api/mobile/reply/draft | auth/workspace → gate | prior messages retained |
| POST /api/mobile/reply/transcribe | auth/workspace → gate before upload/upstream transcription | stored transcript/read retained |
| POST /api/tools/subtitle/generate | auth/workspace → gate before legacy deduction/AI | stored sessions retained |
| subtitle service proxy transcribe/refine/split-lines/fal/proxy | session auth → gate before upstream | sessions, manual lines, export-srt not gated |
| POST /api/mobile/topics all import/queue/text/image workflows | bearer/workspace → gate before external autofill/AI/background callback | GET/PUT/PATCH bookmark/hide/manual edits retained |
| POST /api/topics mode=import | auth/workspace → gate | cover upload/manual preference operations retained |
| GET /api/cron/topic-geography | cron secret → gate | not a public user endpoint |

Defense in depth:

- `getAnthropic()` returns null before SDK/key lookup when explicitly gated.
  Covers nested content understanding, venue web search, angle generation,
  final pack generation, command search, bio/media-kit/brand analysis,
  topic editorial and geography helpers. Read fallback is not labelled a new AI result.
- Both `resolveSharedTopicMetadata` helpers skip the potentially paid external
  `idea-brainstorm /autofill-link`, including GET cover-repair fallback.
- `rankProduction` rejects before external Core production-recommend.
- `retryTopicGeography` returns before DB lease/retry-budget mutation while gated.
- auth callback `syncUserCredits` returns before legacy Master 300-credit grant
  while gated. This does not change existing production free rights.
- Subtitle client uses the gated service/fal proxy, not a client provider key.

Not generation dependencies: source-page/oEmbed/cover downloads, Core published
topics/delivery receipts, Core published style registry/knowledge bundle, DNA
metadata sync, Instagram metadata, commerce endpoints. These were not invoked
as paid generation tests; upstream service internals have not been audited here.

Evidence levels: static tests assert gates in 22 route files + subtitle proxy;
chat handler unit test exercises mocked auth 401 / configured-gate 503 with
provider callback count zero; factory test proves blocked SDK is not initialized.
Other route runtime/session/data boundaries are NOT proved by static presence.

Remaining before REAL trial: approved persistent trial/workspace RPCs, generalized
persistent limiter across all above workflows (current deployed limiter covers
chat only), stable logical call IDs, media server-probe verification, role tests,
actual DB concurrency/period/event replay tests, complete authenticated browser
read/edit/export and App binary/device verification. A closed Preview is safe to
review but is not an enabled limited trial or a ready public free beta.
