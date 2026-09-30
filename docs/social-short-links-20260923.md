# TikTok / Xiaohongshu share links — 2026-09-23

- Shared website/mobile policy now accepts vm/vt/m.tiktok.com and xhslink.cn/com, including www XHS aliases.
- Metadata requests resolve at most six approved-host hops, upgrade HTTP destinations to HTTPS, reject unsafe redirects, and reject login/challenge pages before AI processing. Authentication is never bypassed.
- Mobile queue retains the original URL; failed enrichment stores a specific reason and a saved-link/content-incomplete state rather than publishing login text.
- TikTok metadata has an official oEmbed fallback for script-rendered pages. Its observed European thumbnail CDN is allowed by the existing durable cover pipeline.
- XHS short links are labelled 小紅書 rather than generic web pages.

Verification: unit tests cover short-link hosts, hostile redirects, HTTP upgrade, bounded loops, login and non-200 responses. Threads/editorial/geography regression tests and TypeScript passed. The supplied TikTok link resolves to @bbo.blackboxoffice/video/7610000929101729046; official oEmbed returns #台灣最強滷肉飯 plus a thumbnail. The supplied XHS link redirects to login and is correctly reported as requiring source text/screenshots. No authenticated end-to-end import or device visual test performed.

Delivery: website/shared API code updated; production deployment recorded in /private/tmp/egg-social-short-links-release.log. App code unchanged; no new binary built, no iPhone install, no on-device verification. Core code/database untouched. User must retry the share; this task did not create a topic on their behalf.
