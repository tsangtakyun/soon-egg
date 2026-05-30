import { CreditBalance } from "@/components/credits/CreditBalance";
import { ToolsHub } from "./ToolsHub";

export default function ToolsPage() {
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
        <CreditBalance />
      </div>

      <ToolsHub />
    </div>
  );
}
