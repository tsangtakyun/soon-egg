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
        <h1 className="mt-2 text-3xl font-black text-zinc-950">點數功能暫時未公開</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          現階段所有創作工具均可免費使用，毋須購買或扣除 Credits。
        </p>
        <div className="mt-6 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          目前顯示餘額：<span className="font-semibold text-zinc-950">0 Credits</span>
        </div>
      </div>
    </main>
  );
}
