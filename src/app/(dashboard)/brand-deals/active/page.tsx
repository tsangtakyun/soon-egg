import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

export default async function ActiveDealsPage() {
  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user) redirect("/login?next=/brand-deals/active");
  if (!activeWorkspace || !admin) redirect("/onboarding");

  const { data: deals } = await admin
    .from("egg_brand_deals")
    .select("id,status,notes,proposed_rate,currency,brand:egg_brands(name,name_zh)")
    .eq("creator_id", activeWorkspace.id)
    .in("status", ["pitched", "negotiating", "active"])
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">進行中合作</h1>
        <p className="mt-2 text-zinc-500">只顯示你工作空間內嘅真實合作資料。</p>
      </div>
      {!deals?.length ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-zinc-300" aria-hidden />
          <p className="mt-3 font-semibold text-zinc-800">暫時未有進行中合作</p>
          <p className="mt-1 text-sm text-zinc-500">收到並確認合作後，項目會顯示喺呢度。</p>
          <Link href="/brand-deals" className="mt-5 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white">查看合作機會</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {deals.map((deal) => {
            const brand = Array.isArray(deal.brand) ? deal.brand[0] : deal.brand;
            return (
              <article key={deal.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-zinc-950">{brand?.name_zh || brand?.name || "未命名品牌"}</h2>
                    {deal.notes && <p className="mt-1 text-sm text-zinc-500">{deal.notes}</p>}
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700"><CalendarClock className="h-4 w-4" aria-hidden />{deal.status}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
