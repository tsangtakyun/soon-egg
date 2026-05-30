import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credits";
import { CreditBadge } from "@/components/ui/CreditBadge";
import { ToolsHub } from "./ToolsHub";

export default async function ToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const balance = user?.email ? await getCreditBalance(user.email) : 0;

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-700">Creator Tools</p>
          <h1 className="mt-1 text-3xl font-black text-zinc-950">創作工具</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            連接 Master Supabase 的題材、劇本、工作板、日程與回覆工具。每次進入工具會先扣除 Credits。
          </p>
        </div>
        <CreditBadge credits={balance} />
      </div>

      <ToolsHub />
    </div>
  );
}
