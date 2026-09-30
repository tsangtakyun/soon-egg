# Team and invitations — Build 30

## Delivery
- Website code: team roster read access for authenticated workspace collaborators; management permissions unchanged. Other members' full email addresses omitted for collaborators. Names currently fall back to email aliases; avatar initials are used.
- Website deployment: production READY, https://egg.sooncreator.network.
- Deployment URL: https://soon-egg-soon-creator-network-codex-nza2it7qc.vercel.app
- Deployment ID: dpl_5eqLAN1xqsRbVwdVRMSPmSXzs3mW
- Commit base: 1a15a74 plus uncommitted work; no commit created.
- Framework: Next.js 16.3.4; remote build duration 31 seconds.
- Website verification: TypeScript passed, permission regression test passed; local 393x852 browser fixture verified collaborator roster, self marker, no management controls, no overflow/error overlay, loading, failed request, successful retry. Fixture removed before deploy. Production anonymous team redirect 307 and mobile team API 401 verified.
- App code: team/workspace identity, collaborator roster, loading on each focus, stale request guard, error retry, compact incoming invitation empty state, member-first layout, fixed duplicated top safe inset.
- Release build: iOS Build 30 succeeded.
- iPhone install: Tommy iPhone installed successfully, installation sequence 4248.
- App device verification: process launch succeeded; authenticated roster and device visual confirmation remain unverified.

## UX notes
Both surfaces retain the existing owner-only business-rules editor under the collapsed role explanation rather than removing access without a replacement settings route. No invitation, member, role or database record was changed during verification.

## Remaining verification boundaries
Browser fixture data is not the live Renee roster. No authenticated production session was available for direct end-to-end account verification. Formal monitoring/drain configuration was not audited.
