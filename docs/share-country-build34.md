# Share routing and topic countries — Build 34

## Changes
- Native OS share links are normalized before Expo Router resolves them, including both schemes and extension payload keys.
- A root-level authenticated share-import screen avoids legacy workspace tab redirects; handoff uses replace and guards duplicate routing.
- Existing storage acknowledgement, payload cleanup, re-share and latest-topic destination are preserved.
- App and website country normalization now share identical logic: structured countries first, recognized country tags, exact city labels, then explicit city title prefixes. Paris example resolves to France. Cuisine/style phrases do not establish a country.
- Existing records are normalized on read, without rewriting source records.

## Delivery status
| Surface | Result |
|---|---|
| Website code | Country resolver updated; shared topic loader already uses it |
| Website deployment | Production dpl_7r4o4B6bGC7JfAdxG44sUPxwwDiQ, alias egg.sooncreator.network |
| Website verification | Typecheck and country regression tests passed; public homepage HTTP 200. Authenticated topic-card visual check not performed |
| App code | Share routing and country normalization updated |
| Release build | iOS Release Build 34 succeeded |
| iPhone install | Installed and launched on connected iPhone; installation sequence 4280 |
| App device verification | Launch confirmed. Actual Instagram share animation and country-card visual confirmation still require user testing |

## Regression verification
- Cold/warm URL normalization, both schemes/payload keys, unrelated links preserved.
- Shared payload cleanup, foreground/session replay guard and intentional re-share.
- Save acknowledgement, duplicate guard, close warning, latest destination and polling cleanup.
- Native and web country tests: reported topics, France/Italy, city fallback, conflicting explicit country and negative style phrases.
- Native and website TypeScript checks passed.

## Acceptance check
Share an Instagram Reel into EGG, finish to Latest Topics, background and reopen. Confirm no unmatched-route flash or replay. Refresh library and confirm the Paris Arnaud Nicolas topic shows France while Japan remains Japan.
