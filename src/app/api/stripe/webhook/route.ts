// Compatibility alias. Stripe production delivery must use /api/webhooks/stripe.
export const runtime = "nodejs";
export { POST } from "@/app/api/webhooks/stripe/route";
