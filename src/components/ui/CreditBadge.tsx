import { Sparkles } from "lucide-react";

export function CreditBadge({ credits }: { credits: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm">
      <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
      <span>{credits < 0 ? "無限" : credits} AI credits</span>
    </div>
  );
}
