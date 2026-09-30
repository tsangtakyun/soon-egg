import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

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
    const { profile, activeRole } = await getActiveCreatorProfile("id, username, stripe_account_id");
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (activeRole !== "owner") return NextResponse.json({ error: "只有工作空間擁有者可以管理 Stripe 收款帳戶" }, { status: 403 });

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
