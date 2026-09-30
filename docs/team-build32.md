# Build 32 — workspace logo and business rules entry

2026-09-21. Website and native code updated.

- Team workspace avatar now falls back to bundled Egg logo for Egg.Soon if its remote image is absent or fails; personal member avatars retain initials fallback.
- Removed full business rules editor from Team; moved to Reply Center.
- Owner-only entry; existing server owner authorization and workspace-scoped API retained.
- Editors show loading/error/retry, prohibit saving before successful load, enforce existing 100–50,000 character bounds, confirm abandoning edits.
- Existing prompt profile and version tables unchanged. No production business rules were modified during tests.

## Verification

- Native and web TypeScript: passed.
- Team identity, access and native UX regression tests: passed.
- New web editor and Team lint: passed.
- Browser fixture at 393×852: egg logo rendered, Team entry absent, editor loading and mock save worked, failed load showed retry and disabled save; no framework error overlay.
- Fixture and generated references removed before completion; fixture not deployed.
- Browser screenshot evidence: /tmp/egg32-team.png, /tmp/egg32-rules.png.
- Production asset HTTP 200; anonymous mobile prompt access HTTP 401.
- Authenticated production editor and physical device visual check remain unverified; no claim of end-to-end production save.

## Deploy result

- URL: https://egg.sooncreator.network
- Deployment: https://soon-egg-soon-creator-network-codex-rjh0xt6ag.vercel.app
- ID: dpl_8VHPkKvPCBzMLwNML7dT7vxLaJMb
- Target/status: production / READY
- Base commit: 1a15a74 plus existing working-tree changes; no new commit.
- Framework: Next.js 16.3.4
- Build duration: 33 seconds
- Post-deploy error scan: no logs found in initial 10-minute window; not proof of no runtime errors.
- Drains: not inspected. Monitoring: bounded initial log scan only.

## Native release

- Release build 32: BUILD SUCCEEDED; artifact CFBundleVersion verified as 32.
- Installed on Tommy iPhone, database sequence 4264.
- App launch succeeded at 21:46 BST, with Team deep link requested.
- Physical device visual verification: pending user confirmation.
