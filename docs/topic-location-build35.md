# Topic location consistency — Build 35

## Diagnosis and changes
- Live central item 42a9be99-78e3-46fa-9421-7994d7dc3487 (尖沙咀泰豐廔) has empty countries/localities/regions; its keywords contain 尖沙咀.
- Native and web use identical country/place helpers, with known Hong Kong districts and additional explicit places found during the current-feed audit.
- Country resolution uses structured countries first, then recognized country tags, then exact place labels and bounded title prefixes. Cuisine/style words are not location evidence.
- Card metadata and filter choices both use localities and regions, with recognized tag/title fallback. Duplicates/country-only place labels are removed; known place hints conflicting with explicit country are excluded.
- Central country resolution occurs before keywords are truncated for display. This is read-time normalization, not a destructive source-data backfill.
- Final live-feed audit: 106 topics, 96 with a location label; reported topic resolves to 🇭🇰 香港 · 尖沙咀. The remaining records lack sufficient supported location evidence; no blanket location is fabricated.

## Separate delivery statuses
| Status | Result |
|---|---|
| Website code | Shared resolver, central mapping and topic-card/filter UI updated |
| Website deployment | Production deployed and aliased to egg.sooncreator.network |
| Website verification | TypeScript, shared resolver/regression tests and HTTP 200 passed; no authenticated browser visual claim |
| App code | Same resolver plus topic-card/filter UI updated |
| Release build | Release Build 35 succeeded |
| iPhone install | Installed on connected iPhone; sequence 4384; launched successfully |
| App device verification | Launch verified; on-device topic-card visual check remains pending |

## Deploy Result
- URL: https://soon-egg-soon-creator-network-codex-k1p67u8br.vercel.app
- Target: production
- Status: READY
- Build Duration: 24s
- Deployment: dpl_J9U6MSVQ9j8EpRzLsri8fpTpcsY7
- Commit: 1a15a74 plus existing workspace changes and this patch (uncommitted)
- Framework: Next.js

## Verification
- Native and website country tests: HK reported title/keyword/locality, bracketed and English place prefixes, country conflict, unknown/no location, country/place deduplication, Japan/France/Taiwan and other current-feed cases.
- Native rendered-screen harness: cards, details, draft apply/cancel, hide/restore and failed-request recovery passed.
- Recommendation regression passed; native and web country/geography helper files are byte-identical.
- React review: pure derived display/filter data, module-level place index, no new requests/effects or auth changes.

Post-deploy error log scan returned no error logs (since 10m). Drains and ongoing monitoring configuration were not audited. User acceptance: refresh topic library and verify the 泰豐廔 card and Hong Kong/place filter on the iPhone.
