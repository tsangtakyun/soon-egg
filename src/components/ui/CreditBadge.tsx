import { Sparkles } from "lucide-react";

export function CreditBadge() {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
        <span className="text-xs">點數功能</span>
      </div>
      <span className="text-xs text-zinc-400">暫時未公開</span>
    </div>
  );
}
