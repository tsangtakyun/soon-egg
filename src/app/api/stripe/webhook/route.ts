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

  return NextResponse.json({ received: true });
}
