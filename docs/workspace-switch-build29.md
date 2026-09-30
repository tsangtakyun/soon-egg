# Workspace switching feedback — Build 29

- Native More switch immediately presents a blocking modal with EggLoader and target workspace name, closes after bootstrap settles, existing visible error/retry remains on failure.
- Native hook rejects overlapping refreshes. Removed pre-request local preference write; loadEggBootstrap persists only the returned successful workspace.
- Website switcher shows named blocking status until reload, guards duplicate calls with ref, unlocks and displays error on network/API failure.
- Tests: native hook deferred-promise test covers immediate busy, duplicate, success, failure retaining data, retry; web actual select handler test covers same boundaries and status retained through successful reload. Both TypeScript checks passed; web lint no errors (two existing internal location.assign warnings in create/delete workflows).
- Native Release Build 29 succeeded, installed Tommy iPhone sequence 4240 and launched More deep link. Physical animation/tap acceptance pending.
- Website code deployed production READY at soon-egg-soon-creator-network-codex-a90ytwih5.vercel.app, alias egg.sooncreator.network. Unauthenticated workspace API 401. Browser visual/authenticated full switch not verified this turn.
- No server API contract changes or workspace data migrations. Base web 1a15a74 plus dirty changes; base native 217b4fd plus dirty changes.
