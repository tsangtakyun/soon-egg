# Threads share import — 2026-09-23

Cause: mobile queue-import and import accepted threads.net only, while the user's share URL used www.threads.com. Website import omitted Threads entirely.

Changes: shared HTTPS/host policy for all three gates (old and new Threads domains); retain website-only A Day Magazine support; reject credentials, unsafe ports and lookalike hosts; label website imports as Threads; allow Threads cover host; decode HTML entities in mobile OG cover URLs before fetching.

Verification:
- User-provided short link /share/_wkVpqjts/ returned HTTP 200 after redirecting to /@tinaaaa0129/post/DdmAEinDUhf.
- Both route metadata parsers extracted the post's Paris croissant description and cover metadata.
- Decoded cover URL returned HTTP 200 image/webp (HEAD request; no media downloaded).
- tests/threads-import.cjs passed old/new hosts, share/post paths, unsafe-host rejection, all three gates, platform labels and metadata decoding.
- TypeScript, diff whitespace checks and geography regression tests passed.
- Website code and shared mobile API updated and deployed to egg.sooncreator.network (deployment log /private/tmp/egg-threads-deploy.log).
- Website verification: public website HTTP check; no authenticated full import performed.
- App code: unchanged; server-side rejection fixed in its existing shared API.
- Release build: none required/produced for this server fix.
- iPhone install: not performed.
- App device verification: not performed. User should retry sharing; no claim that a topic has already been created in their workspace.

Core code/database unchanged this turn. Next.js route-handler/deployment guidance used; unrelated dirty changes retained.
