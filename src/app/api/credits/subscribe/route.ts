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
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { price_id } = await req.json();
  if (!["price_1Tb6uZQ7196tVqUaEFWWDZJ9", "price_1Tb6vjQ7196tVqUaxIYaMIVk"].includes(price_id)) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin() as any;
  const { data: existingSub } = await supabaseAdmin
    .from("egg_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { egg_user_id: user.id },
    });
    customerId = customer.id;
  }

  const baseUrl = appUrl(req);
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: price_id, quantity: 1 }],
    success_url: `${baseUrl}/credits?subscribed=1`,
    cancel_url: `${baseUrl}/credits`,
    metadata: {
      type: "subscription",
      user_id: user.id,
      user_email: user.email,
    },
  });

  return NextResponse.json({ url: session.url });
}
