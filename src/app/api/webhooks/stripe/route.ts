import Stripe from "stripe";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createEggAdmin } from "@/lib/creator-workspace";
import { getMasterSupabaseAdmin } from "@/lib/supabase-master";

export const runtime = "nodejs";
let stripeClient: Stripe | null = null;
function getStripe() { const key = process.env.STRIPE_SECRET_KEY; if (!key) return null; return stripeClient ??= new Stripe(key); }
function normalizeEmail(value?: string | null) { return value?.trim().toLowerCase() || null; }
function idOf(value: string | { id?: string } | null | undefined) { return typeof value === "string" ? value : value?.id ?? null; }

const MONTHLY_CREDITS: Record<string, number> = {
  price_1Tb6uZQ7196tVqUaEFWWDZJ9: 800,
  price_1Tb6vjQ7196tVqUaxIYaMIVk: 2500,
};

async function addCredits(email: string, credits: number, source: string) {
  const admin = getMasterSupabaseAdmin();
  if (!admin) throw new Error("Master Supabase env vars are missing");
  const normalized = normalizeEmail(email);
  if (!normalized || credits <= 0) return;
  const { data: row } = await admin.from("user_credits").select("user_id,balance,total_purchased").eq("email", normalized).maybeSingle();
  if (!row) {
    await admin.from("user_credits").insert({ user_id: randomUUID(), email: normalized, balance: credits, total_purchased: credits, total_used: 0, source });
    return;
  }
  await admin.from("user_credits").update({ balance: Number(row.balance ?? 0) + credits, total_purchased: Number(row.total_purchased ?? 0) + credits, updated_at: new Date().toISOString() }).eq("email", normalized);
}

async function claimEvent(event: Stripe.Event) {
  const admin = createEggAdmin();
  const { error } = await admin.from("egg_stripe_events").insert({ event_id: event.id, event_type: event.type, livemode: event.livemode });
  if (!error) return { admin, duplicate: false };
  if (error.code !== "23505") throw error;
  const { data } = await admin.from("egg_stripe_events").select("status,updated_at").eq("event_id", event.id).single();
  const stale = data?.status === "processing" && Date.now() - new Date(data.updated_at).getTime() > 5 * 60 * 1000;
  if (data?.status !== "failed" && !stale) return { admin, duplicate: true };
  await admin.from("egg_stripe_events").update({ status: "processing", last_error: null, updated_at: new Date().toISOString() }).eq("event_id", event.id);
  return { admin, duplicate: false };
}

async function fulfillProductOrder(stripe: Stripe, event: Stripe.Event, session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  if (!meta.product_id) return false;
  const admin = createEggAdmin();
  const { data: product } = await admin.from("egg_digital_products").select("id,creator_id,title,currency,is_active,is_archived").eq("id", meta.product_id).maybeSingle();
  if (!product || product.is_archived || !product.is_active) throw new Error("Product is unavailable");
  const { data: creator } = await admin.from("egg_creator_profiles").select("id,username,stripe_account_id").eq("id", product.creator_id).maybeSingle();
  if (!creator || (meta.creator_id && meta.creator_id !== creator.id) || (meta.creator_username && meta.creator_username !== creator.username)) throw new Error("Product Creator ownership mismatch");

  const gross = Number(session.amount_total ?? meta.gross_amount_minor ?? 0);
  const feeBps = Number(meta.platform_fee_bps ?? 1000);
  const fee = Number(meta.platform_fee_amount_minor ?? Math.round(gross * feeBps / 10000));
  const net = Number(meta.creator_net_amount_minor ?? gross - fee);
  if (![gross, feeBps, fee, net].every(Number.isInteger) || gross < 0 || fee < 0 || net < 0 || gross !== fee + net) throw new Error("Invalid order financial snapshot");

  const paymentIntentId = idOf(session.payment_intent as string | { id?: string } | null);
  let chargeId: string | null = null, transferId: string | null = null, applicationFeeId: string | null = null;
  if (!paymentIntentId && meta.connected_account_id !== creator.stripe_account_id) throw new Error("Connected account ownership could not be verified");
  if (paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const destination = idOf(intent.transfer_data?.destination as string | { id?: string } | null);
    const checkoutDestination = meta.connected_account_id ?? destination;
    if (!checkoutDestination || checkoutDestination !== creator.stripe_account_id) throw new Error("Connected account ownership mismatch");
    chargeId = idOf(intent.latest_charge as string | { id?: string } | null);
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId);
      transferId = idOf(charge.transfer as string | { id?: string } | null);
      applicationFeeId = idOf(charge.application_fee as string | { id?: string } | null);
    }
  }
  const paid = session.payment_status === "paid";
  const shipping = (session as unknown as { shipping_details?: { name?: string; address?: { line1?: string; line2?: string; city?: string } } }).shipping_details;
  const address = shipping?.address;
  const { error } = await admin.from("egg_product_orders").upsert({
    creator_id: creator.id, product_id: product.id, product_title: product.title,
    amount: gross / 100, gross_amount_minor: gross, platform_fee_bps: feeBps,
    platform_fee_amount_minor: fee, creator_net_amount_minor: net,
    currency: (session.currency ?? product.currency ?? "HKD").toUpperCase(),
    buyer_email: session.customer_details?.email ?? session.customer_email ?? null,
    buyer_name: session.customer_details?.name ?? null,
    stripe_session_id: session.id, stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId, stripe_transfer_id: transferId, stripe_application_fee_id: applicationFeeId,
    stripe_event_id: event.id, status: paid ? "paid" : "pending",
    payment_status: paid ? "paid" : session.payment_status,
    paid_at: paid ? new Date(event.created * 1000).toISOString() : null,
    delivery_name: shipping?.name ?? null,
    delivery_address: address ? `${address.line1 ?? ""} ${address.line2 ?? ""}`.trim() : null,
    delivery_district: address?.city ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_session_id" });
  if (error) throw error;
  if (paid) await admin.rpc("increment_product_sales_once", { p_stripe_session_id: session.id, p_product_id: product.id, p_amount: gross / 100 });
  return true;
}

async function recordAdjustment(event: Stripe.Event, type: "refund" | "dispute" | "dispute_won" | "dispute_lost", chargeId: string, amount: number, currency: string, ids: { refund?: string; dispute?: string; reason?: string | null; status?: string | null }) {
  const admin = createEggAdmin();
  const { data: order } = await admin.from("egg_product_orders").select("id").eq("stripe_charge_id", chargeId).maybeSingle();
  if (!order) return;
  const { error } = await admin.from("egg_order_adjustments").insert({ order_id: order.id, adjustment_type: type, amount_minor: amount, currency: currency.toUpperCase(), stripe_event_id: event.id, stripe_refund_id: ids.refund, stripe_dispute_id: ids.dispute, reason: ids.reason, status: ids.status });
  if (error && error.code !== "23505") throw error;
  await admin.from("egg_product_orders").update({ payment_status: type === "refund" ? "refunded" : "disputed", updated_at: new Date().toISOString() }).eq("id", order.id);
}

async function processEvent(stripe: Stripe, event: Stripe.Event) {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (await fulfillProductOrder(stripe, event, session)) return;
    if (session.metadata?.type === "credit_purchase" && session.payment_status === "paid") {
      const email = normalizeEmail(session.metadata.user_email), credits = Number.parseInt(session.metadata.credits ?? "0", 10);
      if (email && credits > 0) await addCredits(email, credits, "stripe_credit_purchase");
    }
    if (session.mode === "subscription" || session.metadata?.type === "subscription") {
      const subscriptionId = idOf(session.subscription as string | { id?: string } | null);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const plan = subscription.items.data[0]?.price.id === "price_1Tb6uZQ7196tVqUaEFWWDZJ9" ? "basic" : "pro";
        await createEggAdmin().from("egg_subscriptions").upsert({ user_id: session.metadata?.user_id, email: session.metadata?.user_email ?? session.customer_details?.email ?? "", plan, status: "active", stripe_subscription_id: subscriptionId, stripe_customer_id: idOf(subscription.customer as string | { id?: string }), updated_at: new Date().toISOString() }, { onConflict: "stripe_subscription_id" });
      }
    }
  }
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const line = invoice.lines.data[0] as unknown as { price?: { id?: string }; pricing?: { price_details?: { price?: string } } };
    const priceId = line?.price?.id ?? line?.pricing?.price_details?.price;
    const source = invoice as unknown as { subscription?: string | { id?: string }; parent?: { subscription_details?: { subscription?: string; metadata?: Stripe.Metadata } } };
    const subscriptionId = idOf(source.subscription) ?? source.parent?.subscription_details?.subscription;
    const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
    const metadata = subscription?.metadata ?? source.parent?.subscription_details?.metadata ?? {};
    const email = normalizeEmail(invoice.customer_email || metadata.user_email), credits = priceId ? MONTHLY_CREDITS[priceId] : 0;
    if (email && credits > 0) await addCredits(email, credits, metadata.plan ? `stripe_${metadata.plan}` : "stripe_subscription");
    if (subscriptionId) await createEggAdmin().from("egg_subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
  }
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await createEggAdmin().from("egg_subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge, refund = charge.refunds?.data.at(-1);
    await recordAdjustment(event, "refund", charge.id, charge.amount_refunded, charge.currency, { refund: refund?.id, reason: refund?.reason, status: refund?.status });
  }
  if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const type = event.type === "charge.dispute.created" ? "dispute" : dispute.status === "won" ? "dispute_won" : "dispute_lost";
    await recordAdjustment(event, type, idOf(dispute.charge as string | { id?: string }) ?? "", dispute.amount, dispute.currency, { dispute: dispute.id, reason: dispute.reason, status: dispute.status });
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe(), signature = req.headers.get("stripe-signature"), secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !signature || !secret) return NextResponse.json({ error: "Missing Stripe webhook config" }, { status: 400 });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await req.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  const { admin, duplicate } = await claimEvent(event);
  if (duplicate) return NextResponse.json({ received: true, duplicate: true });
  try {
    await processEvent(stripe, event);
    await admin.from("egg_stripe_events").update({ status: "processed", processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("event_id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    await admin.from("egg_stripe_events").update({ status: "failed", last_error: error instanceof Error ? error.message : "Unknown error", updated_at: new Date().toISOString() }).eq("event_id", event.id);
    console.error("[stripe-webhook] handler error", event.id, event.type, error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
