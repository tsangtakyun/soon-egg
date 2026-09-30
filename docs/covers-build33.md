# Build 33 — Instagram analytics covers

## Changes
- Website and iOS analytics use recoverable cover components.
- Failed/missing cover triggers one authenticated refresh, then an explicit unavailable label if recovery fails. Existing Instagram links remain.
- VIDEO media URLs are not passed to image components when no thumbnail exists.
- Shared POST /api/instagram/media-cover checks session/workspace membership and queries the requested row within that workspace. Client supplies only a row ID, never a URL/token.
- Refresh reads current Meta media fields using the stored provider and token. Only media_url and thumbnail_url are persisted; historical metrics remain untouched.
- Regular Instagram sync refreshes covers for the best five from the most recent 50 stored rows, including older posts outside the latest-12 insights sample. Individual failures do not interrupt metrics synchronization.

## Verification
- Both projects: TypeScript passed; changed web cover/service/API lint passed.
- tests/instagram-covers.cjs: image/video selection, HTTPS validation, provider/authorization header, cover-only writes, workspace filters, missing row stops upstream calls, top-five selection from 50, unauthenticated and invalid ID rejection passed.
- Browser fixture (393×852): expired cover recovered; missing cover failed once and showed unavailable; good cover made no refresh call. No framework error overlay. Screenshot /tmp/egg33-covers.png.
- Fixture removed before production deploy.
- Production anonymous API request: 401.
- Live authenticated Meta cover recovery for Renee's three posts has NOT been visually verified. Test data was mocked; no promise those specific images are restored.

## Deployment
- Website code: complete.
- Website deployment: production READY, https://egg.sooncreator.network
- Artifact: https://soon-egg-soon-creator-network-codex-yc1t8o8g3.vercel.app
- ID: dpl_59FrNPb9dsiRMDcudutUcub2Cu5h
- Base commit 1a15a74 plus existing dirty working tree; Next.js 16.3.4; build 43 seconds.
- Initial error-level log scan (10 minutes): no logs found; not proof of error-free authenticated flow.
- Drains not inspected; monitoring limited to initial scan.
- App code: complete.
- Native Release build: succeeded, CFBundleVersion 33 verified.
- iPhone install: succeeded, sequence 4272.
- App launch: succeeded 22:33 BST, analytics deep link requested.
- Physical device cover verification: pending user confirmation.
