# Team identity and layout — Build 31

## Changes
- Both roles share workspace identity → member roster → received invitations → collapsed role explanation.
- Native headings use the same sans family as the rest of this management screen; role labels shortened.
- Invite controls moved to an explicit invite button and modal/sheet; native sheet avoids keyboard.
- Current workspace branding is separate from individual user identity.
- Shared server helper reads only member IDs already authorized/scoped by the roster query, resolves Auth display_name/full_name/name and avatar_url/picture, and serializes only public identity fields.
- Auth identity failure falls back to the email alias/initial. Missing or broken images fall back to initials on both surfaces.
- Existing management permissions and collaborator email privacy preserved. No database migration or account data changes.

## Verification
- Native TypeScript and scripts/test-team-ux.cjs passed.
- Website TypeScript and targeted ESLint passed.
- tests/team-access.cjs and tests/team-identities.cjs passed.
- Browser fixture at 393x852: owner/member layouts, collapsed invite form, modal open/close/Escape, mock submission failure preserving input, real local image render, broken-image fallback, no overflow/error overlay or JS errors.
- Fixture removed before deployment. Browser data is synthetic, not proof of live users' metadata/photos.
- React review influenced stale request handling, public field serialization, avatar fallback, and modal keyboard/focus behavior.

## Delivery
- Website code: complete.
- URL: https://soon-egg-soon-creator-network-codex-kb3mg5i4j.vercel.app
- Alias: https://egg.sooncreator.network
- Target/status: production / READY, dpl_Bzc6FbZjb7xcZaj8VJ2H1pnTxpU1.
- Commit base: 1a15a74 plus uncommitted changes; no commit made.
- Framework/build duration: Next.js 16.3.4 / 32 seconds.
- Website verification: fixture and regression tests passed; production /team anonymous redirect 307 and /api/mobile/team anonymous 401 confirmed.
- App code: complete. Release Build 31 succeeded.
- iPhone install: succeeded, installation sequence 4256. Process launch succeeded.
- Error scan: no error logs returned for the new deployment in the first 10-minute window.
- Drains/monitoring configuration: not audited; authenticated live-account verification remains a gap.
Live authenticated avatar verification and physical-device visual verification require user confirmation.
