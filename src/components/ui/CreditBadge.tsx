import Link from "next/link";
import { Sparkles } from "lucide-react";

export function CreditBadge({ credits }: { credits: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
        <span className="text-xs">{credits < 0 ? "無限" : credits.toLocaleString()} credits</span>
      </div>
      <Link href="/credits" className="text-xs font-medium text-purple-600 hover:text-purple-500">
        購買
      </Link>
    </div>
  );
}
