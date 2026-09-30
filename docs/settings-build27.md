# Settings UX — 2026-09-21 / iOS Build 27

## Changes
- Compact settings menu: public profile, Creator DNA, Instagram connection, owner-only product payout settings.
- Members see read-only values instead of disabled forms. Public Facebook/Threads handles are separated from authenticated Instagram connection.
- Removed duplicate native safe-area wrapper and unavailable-platform placeholders; retained stored platform values.
- Dirty-only saves, header departure warning on native; browser unload/link warning and failed-request handling on web.
- Mobile API exposes an Instagram connection boolean, never the access token. Existing owner-only Stripe authorization is unchanged.

## Verification
- Native and web TypeScript passed; scoped web ESLint and both diff whitespace checks passed.
- settings-access.cjs: role contract, member write denied, access token omitted, unauthenticated access denied.
- Existing recommendation, hide policy, Creator DNA, native tab routes, topic UX, share resume and share UX regression checks passed.
- Actual SettingsClient rendered with local fixture data at 393 × 852: member landing lacks payments; member profile has zero input fields, no overflow or error overlay; owner landing includes payments and owner profile exposes editors with dirty-only save.
- Fixture removed before deployment. Browser save-failure interaction was inconclusive after development reload; not claimed as passed. Catch handlers were type/lint checked.
- Production deployment dpl_5ghQR49vaLGFP1Bf5bqnB43RrGaV READY, Next.js, 27s, base 1a15a74 plus working changes, alias egg.sooncreator.network.
- Production settings redirects unauthenticated requests to login (307); mobile settings returns 401. No error logs returned by initial 10-minute scan; this is not continuous monitoring.
- Native Release Build 27 succeeded, installed on Tommy iPhone (sequence 4224), launched with settings deep link.
- Pending: authenticated production visual acceptance and physical iPhone layout/tap acceptance. No real Stripe onboarding/payment was performed.
