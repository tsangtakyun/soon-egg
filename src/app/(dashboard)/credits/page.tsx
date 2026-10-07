import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CreditsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="px-4 pb-10 pt-[10vh] sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">SOON-EGG</p>
        <h1 className="mt-2 text-3xl font-black text-zinc-950">Credits 規格預覽</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          免費版每月 30 Credits；創作者版每月 150 Credits。SOON AI 每次 1 Credit、劇本生成每次 3 Credits、EggThis 每次 5 Credits。
        </p>
        <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Preview 規格 · 扣點及購買功能尚未啟用，現時不會扣除 Credits
        </div>
      </div>
    </main>
  );
}
