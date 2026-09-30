# Settings / DNA cleanup — Build 28

- Native settings avatar supports relative URLs and image failure fallback (Egg.Soon egg asset; other creators initial). Web failure fallback does not change saved avatar URL.
- Native placeholder text explicitly gray in settings and DNA; disabled action opacity increased.
- Instagram public handle restored with connection-management entry. Facebook/Threads remain public handles.
- Removed independent profile category editing on both surfaces. Profile APIs no longer overwrite legacy content_categories, including old-client submissions.
- DNA categories authoritative in topic library, active-profile consumers, public profile and public media kit; legacy categories retained as read-only fallback if DNA not configured. No data migration or audience rewriting.
- Audience field helper distinguishes viewers from creator/platform descriptions.

Verification: native/web TypeScript, scoped web ESLint, settings-access, settings-dna-unification, creator-dna, topic-recommendations, topic-hide-policy, native tab/topic/share-resume checks passed. Hide-policy harness updated to load new real DNA helper dependency.

Browser fixture: actual SettingsClient, 393×852, broken avatar recovered to loaded egg asset, IG handle present, old category control absent, gray placeholders, no horizontal overflow/error overlay. Fixture removed before deploy.

Website production READY dpl_7SJCFVzCSeu6xQxLLSi5DMruxaaq; alias egg.sooncreator.network; base 1a15a74 plus working changes; Next.js. Unauthenticated settings 307 / mobile settings API 401. Authenticated production acceptance remains pending.

Native Release Build 28 succeeded, installed on Tommy iPhone sequence 4232 and launched settings deep link. Physical appearance/tap acceptance remains pending. No Renee distribution created this turn.
