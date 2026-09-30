<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stripe Webhook Setup
1. Go to Stripe Dashboard → Webhooks → Add endpoint
2. URL: https://egg.sooncreator.network/api/webhooks/stripe
3. Events to listen: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
4. Copy webhook signing secret → add to Vercel env: STRIPE_WEBHOOK_SECRET

`/api/webhooks/stripe` is the canonical endpoint for credits, subscriptions,
product orders, refunds, and disputes. `/api/stripe/webhook` is a compatibility
alias only and must not be configured as a second Stripe endpoint.

## EGG Cross-Surface Delivery Rule

Every EGG product change must be assessed and delivered across all applicable
surfaces: website UI, iOS App UI, and the shared API/data contract. Do not mark
work complete after changing only one surface. Final verification must report
website code, website deployment, website verification, App code, release
build, iPhone install, and App device verification as separate statuses.
