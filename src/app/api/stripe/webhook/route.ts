import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

let stripeClient: Stripe | null = null;
let supabaseAdminClient: ReturnType<typeof createSupabaseClient> | null = null;

function getStripe() {
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripeClient;
}

function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return supabaseAdminClient;
}

function planFromPrice(priceId?: string | null) {
  if (priceId === "price_1Tb6uZQ7196tVqUaEFWWDZJ9") return { plan: "basic", credits: 800, label: "Basic" };
  return { plan: "pro", credits: 2500, label: "Pro" };
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    const supabaseAdmin = getSupabaseAdmin() as any;

    if (session.mode === "subscription" || meta.type === "subscription") {
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!subscriptionId) return NextResponse.json({ received: true });

      const subscription = (await getStripe().subscriptions.retrieve(subscriptionId)) as any;
      const priceId = subscription.items.data[0]?.price.id as string | undefined;
      const planInfo = planFromPrice(priceId);
      const email = meta.user_email ?? session.customer_details?.email ?? session.customer_email ?? "";

      await supabaseAdmin.from("egg_subscriptions").upsert(
        {
          user_id: meta.user_id,
          email,
          plan: planInfo.plan,
          status: "active",
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
          current_period_start: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );

      if (email) {
        const { addCredits } = await import("@/lib/credits");
        await addCredits({
          email,
          amount: planInfo.credits,
          type: "subscription_renewal",
          description: `${planInfo.label} 訂閱 — 每月 ${planInfo.credits.toLocaleString()} Credits`,
        });
      }

      return NextResponse.json({ received: true });
    }

    if (meta.type === "credit_purchase") {
      const { addCredits } = await import("@/lib/credits");
      await addCredits({
        email: meta.user_email ?? "",
        amount: Number.parseInt(meta.credits ?? "0", 10),
        type: "purchase",
        description: "購買 Credits",
        stripe_session_id: session.id,
      });
      return NextResponse.json({ received: true });
    }

    const { data: profile } = await supabaseAdmin.from("egg_creator_profiles").select("id").eq("username", meta.creator_username).single();
    if (!profile) return NextResponse.json({ received: true });

    const { data: product } = await supabaseAdmin.from("egg_digital_products").select("title, price, currency").eq("id", meta.product_id).single();
    const shipping = (session as any).shipping_details;
    const address = shipping?.address;

    const { error: insertError } = await supabaseAdmin.from("egg_product_orders").insert({
      creator_id: profile.id,
      product_id: meta.product_id,
      product_title: product?.title ?? null,
      amount: session.amount_total ? Math.round(session.amount_total / 100) : product?.price ?? 0,
      currency: product?.currency ?? "HKD",
      buyer_email: session.customer_details?.email ?? session.customer_email ?? "",
      buyer_name: session.customer_details?.name ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      status: "paid",
      delivery_name: shipping?.name ?? null,
      delivery_address: address ? `${address.line1 ?? ""} ${address.line2 ?? ""}`.trim() : null,
      delivery_district: address?.city ?? null,
    });

    if (insertError) {
      console.error("[webhook] Order insert error:", insertError);
      return NextResponse.json({ received: true });
    }

    try {
      await supabaseAdmin.rpc("increment_product_sales", {
        p_product_id: meta.product_id,
        p_amount: product?.price ?? 0,
      });
    } catch (err) {
      console.error("[webhook] increment_product_sales error:", err);
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as any;
    if (invoice.billing_reason === "subscription_cycle") {
      const supabaseAdmin = getSupabaseAdmin() as any;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      const { data: sub } = await supabaseAdmin
        .from("egg_subscriptions")
        .select("email, plan")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      if (sub?.email) {
        const creditsToAdd = sub.plan === "basic" ? 800 : 2500;
        const { addCredits } = await import("@/lib/credits");
        await addCredits({
          email: sub.email,
          amount: creditsToAdd,
          type: "subscription_renewal",
          description: `${sub.plan === "basic" ? "Basic" : "Pro"} 月費更新`,
        });
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const supabaseAdmin = getSupabaseAdmin() as any;
    await supabaseAdmin
      .from("egg_subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}
