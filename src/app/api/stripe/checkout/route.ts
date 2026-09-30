import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

export async function POST(req: Request) {
  const { product_id, buyer_email } = await req.json();
  if (!product_id) return NextResponse.json({ error: "Missing product_id" }, { status: 400 });

  const supabaseAdmin = getSupabaseAdmin() as any;
  const { data: product } = await supabaseAdmin
    .from("egg_digital_products")
    .select("*")
    .eq("id", product_id)
    .eq("is_active", true)
    .eq("is_archived", false)
    .single();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (!product.is_unlimited_stock && Number(product.stock ?? 0) < 1) {
    return NextResponse.json({ error: "Product is out of stock" }, { status: 409 });
  }

  const { data: creator } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("id, username, stripe_account_id, stripe_onboarding_complete, commerce_fee_bps, commerce_fee_effective_at")
    .eq("id", product.creator_id)
    .single();

  if (!creator?.stripe_account_id || !creator.stripe_onboarding_complete) {
    return NextResponse.json({ error: "Creator payment not set up" }, { status: 400 });
  }

  const price = Number(product.price ?? 0);
  if (price <= 0) return NextResponse.json({ error: "Free products cannot use checkout" }, { status: 400 });

  const currencyMap: Record<string, string> = {
    HKD: "hkd",
    USD: "usd",
    TWD: "twd",
    SGD: "sgd",
  };
  const currency = currencyMap[product.currency ?? "HKD"] ?? "hkd";
  const unitAmount = Math.round(price * 100);
  if (creator.id !== product.creator_id) return NextResponse.json({ error: "Product ownership mismatch" }, { status: 409 });
  const effectiveAt = creator.commerce_fee_effective_at ? new Date(creator.commerce_fee_effective_at).getTime() : 0;
  const feeBps = effectiveAt <= Date.now() ? Number(creator.commerce_fee_bps ?? 1000) : 1000;
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) return NextResponse.json({ error: "Invalid Creator fee terms" }, { status: 500 });
  const applicationFeeAmount = Math.round((unitAmount * feeBps) / 10000);
  const needsShipping = product.product_type === "physical";
  const baseUrl = appUrl(req);

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: buyer_email || undefined,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: product.title,
            description: product.description ?? undefined,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: creator.stripe_account_id,
      },
    },
    shipping_address_collection: needsShipping
      ? {
          allowed_countries: ["HK", "TW", "SG", "MY"],
        }
      : undefined,
    success_url: `${baseUrl}/${creator.username}/shop?success=1&product=${product_id}`,
    cancel_url: `${baseUrl}/${creator.username}/shop`,
    metadata: {
      product_id: product.id,
      creator_id: product.creator_id,
      connected_account_id: creator.stripe_account_id,
      gross_amount_minor: String(unitAmount),
      platform_fee_bps: String(feeBps),
      platform_fee_amount_minor: String(applicationFeeAmount),
      creator_net_amount_minor: String(unitAmount - applicationFeeAmount),
      creator_username: creator.username,
      product_type: product.product_type ?? "other",
    },
  });

  await supabaseAdmin.from("egg_product_orders").upsert({
    creator_id: product.creator_id,
    product_id: product.id,
    product_title: product.title,
    amount: unitAmount / 100,
    gross_amount_minor: unitAmount,
    platform_fee_bps: feeBps,
    platform_fee_amount_minor: applicationFeeAmount,
    creator_net_amount_minor: unitAmount - applicationFeeAmount,
    currency: currency.toUpperCase(),
    buyer_email: buyer_email || null,
    stripe_session_id: session.id,
    status: "pending",
    payment_status: "pending",
  }, { onConflict: "stripe_session_id" });

  return NextResponse.json({ url: session.url });
}
