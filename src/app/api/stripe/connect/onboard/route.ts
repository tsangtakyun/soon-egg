import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

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
  try {
    const serverSupabase = await createServerClient();
    if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin() as any;
    const { data: profile } = await supabaseAdmin.from("egg_creator_profiles").select("id, username, stripe_account_id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    let accountId = profile.stripe_account_id as string | null;
    const stripe = getStripe();

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "HK",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      await supabaseAdmin.from("egg_creator_profiles").update({ stripe_account_id: accountId }).eq("id", profile.id);
    }

    const baseUrl = appUrl(req);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/products?stripe=refresh`,
      return_url: `${baseUrl}/products?stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[stripe/connect/onboard]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe onboarding failed" }, { status: 500 });
  }
}
