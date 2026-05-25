import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

let stripeClient: Stripe | null = null;

const fallbackPackages = [
  { id: "starter", name: "Starter Pack", emoji: "⚡", credits: 300, price_hkd: 38 },
  { id: "growth", name: "Growth Pack", emoji: "🚀", credits: 1000, price_hkd: 98 },
  { id: "creator", name: "Creator Pack", emoji: "✨", credits: 2500, price_hkd: 198 },
  { id: "pro", name: "Pro Pack", emoji: "💎", credits: 6000, price_hkd: 398 },
];

function getStripe() {
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripeClient;
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

  const { package_id } = await req.json();
  const { data: pkg } = await (masterSupabase as any).from("credit_packages").select("*").eq("id", package_id).single();
  const selectedPackage = pkg ?? fallbackPackages.find((item) => item.id === package_id);
  if (!selectedPackage) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const baseUrl = appUrl(req);
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "hkd",
          unit_amount: Math.round(Number(selectedPackage.price_hkd) * 100),
          product_data: {
            name: `SOON-EGG ${selectedPackage.emoji ?? ""} ${selectedPackage.name}`,
            description: `${Number(selectedPackage.credits).toLocaleString()} Credits`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/credits?success=1`,
    cancel_url: `${baseUrl}/credits`,
    metadata: {
      type: "credit_purchase",
      package_id: selectedPackage.id,
      credits: String(selectedPackage.credits),
      user_email: user.email,
    },
  });

  return NextResponse.json({ url: session.url });
}
