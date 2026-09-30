# Home command quantity / destination fix

## Delivered
- Intent separates requested count, ISO country, city and city aliases from format. Explicit Chinese/Arabic quantities override model extraction; default 3, current batch limit 12.
- Library selection loads structured countries/localities and excludes conflicting countries. Two-character Chinese place names can match. Same-source library duplicates removed without stripping YouTube video IDs.
- Insufficient candidates trigger supplementary web research; source result URL must exist in search results. Search failure retains library results. Model under-production falls back to grounded candidates, not invented venues.
- Deterministic found/target answer avoids ungrounded verification claims; titles no longer cut at 28 characters.
- Website and native composer compact after results; quantity chip; static honest loading message replaces native timer-based steps.

## Verification
- command-quantity.cjs PASS: quantity, bilingual Paris, structured country conflict, source dedup.
- command-flow.cjs PASS: eight candidates -> eight results, one candidate + failed search -> 1/8, shortcuts, history, pagination, authentication isolation.
- Website TypeScript and targeted ESLint PASS; native TypeScript PASS.
- Production deploy READY: dpl_2pXQXLDwc28EYYz8Tb5qvACMou4P; alias egg.sooncreator.network. Next.js build completed; base commit 1a15a74 plus existing and current working-tree edits.
- Public site browser opens; unauthenticated command API returns 401. No production error logs found in short post-release scan; this is not authenticated flow verification.
- iOS Release build 37 succeeded and installed on Tommy iPhone.

## Limits / remaining verification
- Authenticated live Paris request, actual web-search quality and physical iPhone layout not yet verified.
- Browser session must be authenticated to inspect command result UI.
- No server-streamed per-stage progress yet; loading intentionally does not pretend to know the current stage.
- No new quick-follow-up buttons or editable filter chips in this patch.
- Same-source deduplication does not guarantee different posts about the same venue are always merged; model is instructed not to split venues.
- Requests above 12 are currently bounded to a 12-item batch; multi-batch delivery not implemented.
