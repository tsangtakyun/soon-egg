# Production source recovery

This branch preserves the source checkout used to continue the EGG production work without modifying the heavily dirty shared checkout at `../soon-egg`.

- Production project: `soon-egg-soon-creator-network-codex`
- Vercel project ID: `prj_hqQZox4G7hwVTC36mt67BHdS6lC2`
- Production deployment verified on 2026-09-30: `dpl_AnG6DGBotv9pW2A3exscchm4nbJW`
- Production URL: `https://egg.sooncreator.network`
- Deployment status at recovery time: `Ready`
- Source recovered from: `/private/tmp/soon-egg-bookmarks-quotes.eyQfmy`
- Original base commit: `df64320` (`master` in the shared checkout at recovery time)

`deployment-source-manifest.json` is retained unchanged as historical evidence from the earlier recovery operation. It names deployment `dpl_5uaJvHpGZG8uQvNzZm1zSaNCzE8M`; it must not be mistaken for the production deployment verified above.

The source tree intentionally excludes generated output, installed dependencies, local Vercel metadata, Supabase CLI temporary files, and real environment files. Example environment files are preserved.

Future changes should be made and committed on this checkout (or a worktree based on this branch), verified in preview, and only then promoted/deployed. Do not deploy the stale shared `../soon-egg` checkout over production until its user-owned changes have been reconciled explicitly.
