# Compact topic library delivery

- Website and native: single-column rectangular rows, 80px/pt square cover, location, two-line title, category/platform, separate 44px/pt save and management controls. Row primary area opens existing detail. Summary/media/production action retained in detail. Existing hide/restore and cover management preserved.
- Image load failure uses category/platform fallback. Non-geographic topics display 不限地區 rather than unknown. Filters scroll out naturally; website no longer pins the entire filter stack. API/data unchanged.
- Verification: website/native TypeScript PASS, targeted website ESLint PASS; tests/topic-list-layout.cjs renders 5 actual component rows and checks separate buttons, square fallback, no summary or production CTA in list.
- Browser fixture: actual SSR component with production stylesheet, 390x844 viewport; visually reviewed screenshot /private/tmp/egg-topic-list-preview.png. No real authenticated interactions tested. iPhone large text/physical layout not verified; 4–5 rows depends on available height and font settings.
- Website deployment: production READY dpl_HTwTj3xBs6pmwwSGHvE84TSctwRW; https://egg.sooncreator.network; Next.js 16.3.4, build 13s, base commit 1a15a74 plus working-tree changes. Short post-deploy error scan returned no logs; monitoring/drains not assessed.
- App code updated, Release 38 build succeeded and installed on Tommy iPhone. Actual topic-library interaction remains unverified.
- Not added: video-type badges without reliable media-type data. No database mutation/migration.
