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

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription_id } = await req.json();
  if (!subscription_id) return NextResponse.json({ error: "Missing subscription_id" }, { status: 400 });

  const supabaseAdmin = getSupabaseAdmin() as any;
  const { data: subscription } = await supabaseAdmin
    .from("egg_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  await getStripe().subscriptions.update(subscription_id, {
    cancel_at_period_end: true,
  });

  await supabaseAdmin
    .from("egg_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription_id)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
