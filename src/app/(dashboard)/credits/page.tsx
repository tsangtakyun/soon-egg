import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";
import { getCreditBalance } from "@/lib/credits";
import { BuyCreditsButton } from "@/components/credits/BuyCreditsButton";

type CreditPackage = {
  id: string;
  name: string;
  emoji?: string | null;
  credits: number;
  price_hkd: number;
};

type CreditTransaction = {
  id: string;
  amount: number;
  description: string | null;
  tool: string | null;
  created_at: string;
};

const fallbackPackages: CreditPackage[] = [
  { id: "starter", name: "Starter Pack", emoji: "⚡", credits: 300, price_hkd: 38 },
  { id: "growth", name: "Growth Pack", emoji: "🚀", credits: 1000, price_hkd: 98 },
  { id: "creator", name: "Creator Pack", emoji: "✨", credits: 2500, price_hkd: 198 },
  { id: "pro", name: "Pro Pack", emoji: "💎", credits: 6000, price_hkd: 398 },
];

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ success?: string; insufficient?: string }> }) {
  const params = await searchParams;
  const serverSupabase = await createServerClient();
  if (!serverSupabase) redirect("/login");

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) redirect("/login");

  console.log("[credits page] user email:", user.email);
  const balance = await getCreditBalance(user.email ?? "");
  console.log("[credits page] balance:", balance);

  const [{ data: packageData }, { data: transactionData }] = await Promise.all([
    (masterSupabase as any).from("credit_packages").select("id, name, emoji, credits, price_hkd").order("price_hkd", { ascending: true }),
    (masterSupabase as any)
      .from("credit_transactions")
      .select("id, amount, description, tool, created_at")
      .eq("email", user.email)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const packages = ((packageData ?? []) as CreditPackage[]).length > 0 ? ((packageData ?? []) as CreditPackage[]) : fallbackPackages;
  const transactions = (transactionData ?? []) as CreditTransaction[];

  return (
    <main className="space-y-8 pt-[10vh]">
      {params.success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Credits 購買成功，餘額已更新。</div>}
      {params.insufficient && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">Credits 不足，請先增值。</div>}

      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-white">
        <p className="text-sm opacity-75">可用 Credits</p>
        <p className="mt-1 text-5xl font-bold">{balance.toLocaleString()}</p>
        <p className="mt-1 text-xs opacity-60">每次使用工具扣 10 · AI 生成扣 3</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">月費訂閱</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PlanCard name="Basic" price="HK$68/月" credits="800 credits / 月" />
          <PlanCard name="Pro" price="HK$168/月" credits="2,500 credits / 月" highlighted />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">一次性購買</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border bg-white p-4">
              <p className="text-2xl">{pkg.emoji ?? "⚡"}</p>
              <p className="mt-2 font-semibold">{pkg.name}</p>
              <p className="mt-1 font-bold text-purple-600">{Number(pkg.credits).toLocaleString()} credits</p>
              <p className="text-sm text-gray-500">HKD ${pkg.price_hkd}</p>
              <BuyCreditsButton packageId={pkg.id} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">使用記錄</h2>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">暫未有使用記錄</p>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between gap-4 py-3">
                <div>
                  <p className="text-sm">{tx.description ?? "Credits 交易"}</p>
                  <p className="text-xs text-gray-400">
                    {tx.tool ?? "SOON-EGG"} · {new Date(tx.created_at).toLocaleString("zh-HK")}
                  </p>
                </div>
                <span className={tx.amount > 0 ? "text-green-600" : "text-red-500"}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PlanCard({ name, price, credits, highlighted = false }: { name: string; price: string; credits: string; highlighted?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 ${highlighted ? "border-purple-300 shadow-sm" : ""}`}>
      <p className="text-sm font-medium text-gray-400">{name}</p>
      <p className="mt-1 text-2xl font-bold">{price}</p>
      <p className="mt-1 text-sm text-purple-600">{credits}</p>
      <button className="mt-4 w-full rounded-xl border px-4 py-2 text-sm text-gray-500" type="button">
        即將推出
      </button>
    </div>
  );
}
