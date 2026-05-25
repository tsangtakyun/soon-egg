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
  const { data: product } = await supabaseAdmin.from("egg_digital_products").select("*").eq("id", product_id).eq("is_active", true).single();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { data: creator } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("username, stripe_account_id, stripe_onboarding_complete")
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
  const applicationFeeAmount = Math.round(unitAmount * 0.1);
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
      creator_username: creator.username,
      product_type: product.product_type ?? "other",
    },
  });

  return NextResponse.json({ url: session.url });
}
