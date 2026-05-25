import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";
import { getCreditBalance } from "@/lib/credits";
import { CreditsClient, type CreditPackage, type CreditSubscription, type CreditTransaction } from "./CreditsClient";

const fallbackPackages: CreditPackage[] = [
  { id: "starter", name: "Starter Pack", emoji: "⚡", credits: 300, price_hkd: 38 },
  { id: "growth", name: "Growth Pack", emoji: "🚀", credits: 1000, price_hkd: 98 },
  { id: "creator", name: "Creator Pack", emoji: "✨", credits: 2500, price_hkd: 198 },
  { id: "pro", name: "Pro Pack", emoji: "💎", credits: 6000, price_hkd: 398 },
];

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; insufficient?: string; subscribed?: string }>;
}) {
  const params = await searchParams;
  const serverSupabase = await createServerClient();
  if (!serverSupabase) redirect("/login");

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: packageData }, { data: transactionData }, { data: subscription }, balance] = await Promise.all([
    (masterSupabase as any)
      .from("credit_packages")
      .select("id, name, emoji, credits, price_hkd")
      .order("price_hkd", { ascending: true }),
    (masterSupabase as any)
      .from("credit_transactions")
      .select("id, amount, description, tool, created_at")
      .eq("email", user.email)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin.from("egg_subscriptions").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
    getCreditBalance(user.email),
  ]);

  const packages = ((packageData ?? []) as CreditPackage[]).length > 0 ? ((packageData ?? []) as CreditPackage[]) : fallbackPackages;

  return (
    <CreditsClient
      balance={balance}
      packages={packages}
      transactions={(transactionData ?? []) as CreditTransaction[]}
      subscription={(subscription ?? null) as CreditSubscription | null}
      success={params.success === "1"}
      subscribed={params.subscribed === "1"}
      insufficient={params.insufficient}
    />
  );
}
