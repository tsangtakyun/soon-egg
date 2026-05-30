import Stripe from "stripe";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { masterSupabaseAdmin } from "@/lib/supabase-master";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const MONTHLY_CREDITS_BY_PRICE_ID: Record<string, number> = {
  price_1Tb6uZQ7196tVqUaEFWWDZJ9: 800,
  price_1Tb6vjQ7196tVqUaxIYaMIVk: 2500,
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

async function upsertCredits(email: string, credits: number, source: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || credits <= 0) return;

  const { data: row } = await masterSupabaseAdmin
    .from("user_credits")
    .select("user_id, balance, total_purchased")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!row) {
    await masterSupabaseAdmin.from("user_credits").insert({
      user_id: randomUUID(),
      email: normalizedEmail,
      balance: credits,
      total_purchased: credits,
      total_used: 0,
      source,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  await masterSupabaseAdmin
    .from("user_credits")
    .update({
      balance: Number(row.balance ?? 0) + credits,
      total_purchased: Number(row.total_purchased ?? 0) + credits,
      updated_at: new Date().toISOString(),
    })
    .eq("email", normalizedEmail);
}

function priceIdFromInvoice(invoice: Stripe.Invoice) {
  const line = invoice.lines.data[0] as unknown as {
    price?: { id?: string };
    pricing?: { price_details?: { price?: string } };
  };

  return line?.price?.id ?? line?.pricing?.price_details?.price ?? null;
}

async function getSubscriptionMetadata(invoice: Stripe.Invoice) {
  const invoiceWithSubscription = invoice as unknown as {
    subscription?: string | { id?: string };
    parent?: { subscription_details?: { subscription?: string; metadata?: Stripe.Metadata } };
  };
  const invoiceSubscription = invoiceWithSubscription.subscription;
  const subscriptionId =
    typeof invoiceSubscription === "string"
      ? invoiceSubscription
      : invoiceSubscription?.id ?? invoiceWithSubscription.parent?.subscription_details?.subscription;

  if (!subscriptionId) return {};

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription.metadata ?? invoiceWithSubscription.parent?.subscription_details?.metadata ?? {};
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing Stripe webhook config" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "credit_purchase") {
        const credits = Number.parseInt(session.metadata.credits ?? "0", 10);
        const userEmail = normalizeEmail(session.metadata.user_email);
        if (userEmail && credits > 0) {
          await upsertCredits(userEmail, credits, "stripe_credit_purchase");
        }
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const metadata = await getSubscriptionMetadata(invoice);
      const priceId = priceIdFromInvoice(invoice);
      const monthlyCredits = priceId ? MONTHLY_CREDITS_BY_PRICE_ID[priceId] : 0;
      const userEmail = normalizeEmail(invoice.customer_email || metadata.user_email);

      if (userEmail && monthlyCredits > 0) {
        await upsertCredits(userEmail, monthlyCredits, metadata.plan ? `stripe_${metadata.plan}` : "stripe_subscription");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[stripe-webhook] subscription cancelled", {
        subscriptionId: subscription.id,
        userEmail: subscription.metadata?.user_email,
        plan: subscription.metadata?.plan,
      });
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error", err);
  }

  return NextResponse.json({ received: true });
}
