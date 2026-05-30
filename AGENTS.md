<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stripe Webhook Setup
1. Go to Stripe Dashboard → Webhooks → Add endpoint
2. URL: https://egg.sooncreator.network/api/webhooks/stripe
3. Events to listen: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
4. Copy webhook signing secret → add to Vercel env: STRIPE_WEBHOOK_SECRET
