import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_ACTIONS, trialPreviewPolicy } from "@/lib/credits/policy";

export default async function CreditsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trial = trialPreviewPolicy(process.env.EGG_TRIAL_PREVIEW_CREDITS);

  return (
    <main className="px-4 pb-10 pt-[10vh] sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">SOON-EGG</p>
        <h1 className="mt-2 text-3xl font-black text-zinc-950">Credits 規格預覽</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          創作者版 HK$98／月，每個工作空間每月 150 Credits。團隊共用額度，付款人與工具使用者分開。
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          既有免費方案每月 30 Credits，香港時間每月 1 號重置；創作者版按訂閱週期重置。未用完的月額不會累積至下期。
        </p>
        <section className="mt-6 rounded-xl border border-zinc-200 p-4">
          <h2 className="font-semibold text-zinc-950">{trial.days} 日免信用卡試用 · Preview 暫定</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">試用額度 {trial.credits} Credits（可調設定，未啟用）。到期停止生成，仍可查看、編輯及下載。試用與永久免費方案的關係待確認；不改現有用戶權益。</p>
        </section>
        <dl className="mt-6 divide-y divide-zinc-100">
          {Object.entries(CREDIT_ACTIONS).filter(([, action]) => action.chargeable || "creditsPerMinute" in action).map(([key, action]) => (
            <div key={key} className="flex justify-between gap-4 py-3 text-sm">
              <dt className="text-zinc-800">{action.label}</dt>
              <dd className="shrink-0 font-semibold text-zinc-950">{"creditsPerMinute" in action ? "每分鐘 3 Credits" : `${action.credits} Credits`}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm leading-6 text-zinc-600">字幕按已驗證影片時長向上取整，最少 1 分鐘，已包含轉錄。結果未確認超過 15 分鐘退款；之後收到結果仍免費交付。跨期退款不增加新一期額度。</p>
        <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Preview 規格 · 真實工作空間錢包尚未配置，試用、扣點及購買均未啟用
        </div>
      </div>
    </main>
  );
}
