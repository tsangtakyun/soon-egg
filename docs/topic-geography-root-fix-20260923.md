# Topic geography root fix — 2026-09-23

## Cause

EGG imports stored location only inside capped display tags. `egg_topic_ideas` had no dedicated geography columns. Its public contribution feed omitted geography, and Core inserted empty arrays. App-side country/city heuristics could not reliably recover those lost values.

## Change

- Add countries, regions, localities, extraction status/evidence/version to EGG topics.
- Web and mobile import enrichment request structured geography, with source-quote validation and a bounded second extraction attempt when needed.
- Invalid/failed extraction does not invent a location or erase existing data. Unknown content is permitted.
- Publish structured geography; Core imports and geography-only updates preserve human edits and existing nonempty fields.
- Shared EGG reads and shadow records retain geography. Prefer Core's geography as a group rather than mixing country/city from conflicting sources.
- Migration applied via the authenticated Supabase Management API, without exporting production secrets.

## Existing records

Reviewed 92 published ready workspace topics against their existing title/summary. Applied geography-only, id/version/timestamp-guarded updates: 80 resolved, 12 unknown. Source evidence retained in the database. Three additional legacy Core rows (Menton, Tokyo nou, Tainan beef soup) were patched with empty-field and human-edit guards. No topic deleted or archived, and no editorial text changed.

## Delivery / verification

- Website code: implemented; TypeScript and geography/recommendation tests passed.
- Website deployment: production alias egg.sooncreator.network, release https://soon-egg-soon-creator-network-codex-fkgmpo58r.vercel.app.
- Core deployment: production alias soon-core.vercel.app, release https://soon-core-f8op2vlch-tsangtakyun-4639s-projects.vercel.app.
- Website verification: live EGG public feed and Core egg-web feed passed country/city and display-label checks. No authenticated visual browser check this turn.
- App code: existing country/city renderer consumes the repaired shared API unchanged; native label parity and topic-library interaction tests passed.
- Release build: not produced this turn; server/data-only correction does not require a new binary for the existing compatible renderer.
- iPhone install: not performed this turn.
- App device verification: not performed; live egg-app feed plus native rendering functions verified, not an on-device screenshot or fresh IG import.

Regression examples: Van Stapele → NL / 阿姆斯特丹; 泰豐廔 → HK / 尖沙咀; Arnaud Nicolas → FR / 巴黎. Live test: `node tests/topic-geography-live.cjs`.

## Limits

Location is intentionally left unknown where actual venue/location evidence is insufficient (brand nationality, cuisine style, generic illustrations). Photo-only location text without supplied textual evidence is not trusted by the source-quote validator. A new real IG import was not submitted during this verification. Production environment secrets were redacted by Vercel; no key access restrictions were changed.
