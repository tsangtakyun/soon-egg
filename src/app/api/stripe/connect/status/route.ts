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

export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    if (!serverSupabase) return NextResponse.json({ connected: false, complete: false });

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin() as any;
    const { data: profile } = await supabaseAdmin
      .from("egg_creator_profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ connected: false, complete: false });
    }

    const account = await getStripe().accounts.retrieve(profile.stripe_account_id);
    const complete = Boolean(account.details_submitted && account.charges_enabled);

    if (complete && !profile.stripe_onboarding_complete) {
      await supabaseAdmin.from("egg_creator_profiles").update({ stripe_onboarding_complete: true }).eq("user_id", user.id);
    }

    return NextResponse.json({
      connected: true,
      complete,
      charges_enabled: account.charges_enabled,
    });
  } catch (error) {
    console.error("[stripe/connect/status]", error);
    return NextResponse.json({ connected: false, complete: false, error: error instanceof Error ? error.message : "Stripe status failed" });
  }
}
