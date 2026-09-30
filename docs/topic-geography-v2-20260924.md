# Topic geography v2 — 2026-09-24

## Delivered semantics

- `place`: an actual destination; eligible for location matching.
- `context`: the topic's related country (news, national culture, brand history, souvenirs). No inferred city and no nearby recommendation.
- `none` / `not_applicable`: genuinely non-geographic subject.
- `unknown`: not enough verified evidence, distinct from a failed request.
- Original supplied text is stored privately for retry, never returned in public/mobile topic selects. Generated summaries are not used as automatic search evidence.
- Bounded background research validates quotes against actual web-search citations, preserving source URLs. Request/validation failures are recorded. Three additional attempts maximum, compare-and-swap leases, final review-required state; no erasure of confirmed countries on a failed re-share.
- Import completion invokes background repair. A daily 06:00 UTC cron handles missed/retry work in batches of three, protected by CRON_SECRET (confirmed configured). Future cron execution and a new live AI import are not yet observed; mocked timeout/citation tests pass.

## Reviewed backfill

Snapshot: `/private/tmp/egg-geography-review-20260924.json` (24 rows, timestamp guarded).
Script: `scripts/backfill-reviewed-geography-20260924.cjs` (read-only unless `--apply`).

- 17 country labels added: 10 actual destinations with locality, 7 contextual countries.
- 4 non-geographic topics marked not applicable.
- 3 remain unconfirmed: Monteliebre pesto pasta (website is in Tijuana, source identity still needs matching; old summary says Spain), 圓本無印長條布丁, unnamed desert-inspired hotel.
- Subject-only classifications based on existing topic wording are explicitly identified in provenance; they do not certify the news story, filming location or product origin.
- Resulting 110 published ready workspace topics: 96 place, 7 context, 4 not applicable, 3 unknown; no pending rows in this reviewed set.

Key primary sources:
- [Kutaisi Botanical Garden](https://georgia.travel/family-attractions/kutaisi-botanical-garden)
- [Himara tourism](https://akt.gov.al/en/cities/chimera/)
- [Ingólfsskáli](https://ingolfsskali.is/wp-content/uploads/2024/08/Ingolfsskali-Viking-Restaurant-2025-Info.pdf)
- [Skirrid Inn](https://www.skirridinn.com/)
- [Luková church](https://www.lukova-kostel.cz/)
- [Les Grands Buffets](https://www.lesgrandsbuffets.com/en/press-inquiries)
- [Arcade Arena London](https://arcadearena.co.uk/london/plan-your-visit/)
- [Chocolate Bar London](https://www.chocolatebarcafe.com/pages/london)
- [El Tintero](https://eltinteromalaga.com/contacto/)

## Cross-surface verification

Website code and shared API: updated. TypeScript and geography/short-link/Threads/editorial tests pass.
Website deployment: production, egg.sooncreator.network; release details appended below.
Website verification: live public API and shared label functions checked; authenticated browser visuals not inspected.
App code: matching geography helpers, context exclusion in nearby matching, API type, build number 36.
Release build: Xcode Release 36 succeeded; `/private/tmp/egg36-native-build.log`.
iPhone install: succeeded on Tommy 的 iPhone (com.theirstudio.sooncreatorlog).
App device verification: Release 36 / display name EGG verified, installed and launched successfully; visual geography flow not inspected on-device.

Core was not deployed/edited. EGG overlays its v2 geography by topic ID when consuming the older Core contract, so Core's missing kind field cannot turn contextual topics into nearby destinations in EGG. Public feed exposes geography_kind for future Core adoption.

Tests: `tests/topic-geography-contract.cjs`, `tests/topic-geography-v2.cjs`, `tests/topic-geography-v2-live.cjs`, `tests/social-short-links.cjs`, `tests/threads-import.cjs`, `tests/topic-editorial-quality.cjs`; native `scripts/test-topic-countries.cjs` and typecheck.

## Release/observability

- Framework: Next.js 16.3.4.
- Commit base: 1a15a74 plus existing and task working-tree changes (no commit created).
- Production URL: https://egg.sooncreator.network
- Initial v2 deployment: dpl_AbtEQ59G12HSMUN87cMCxzHKwXHL (READY).
- Final production deployment: dpl_D8qtjMhvWukfmMRnj6ndjhPHuxH5 (READY), https://soon-egg-soon-creator-network-codex-jvzy1f949.vercel.app; final live API tests passed.
- Release logs: `/private/tmp/egg-geography-v2-release.log`, `/private/tmp/egg-geography-v2-final-release.log`.
- Monitoring gap: real scheduled retry and a newly imported topic have not yet been observed. No new monitoring automation was created.
- Post-deploy error scan: Vercel production error-level query over the last 10 minutes returned no logs; this is a limited smoke window, not an end-to-end new-import verification. Drain configuration not inspected.
