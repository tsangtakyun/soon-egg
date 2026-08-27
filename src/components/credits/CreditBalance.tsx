import { Coins } from "lucide-react";

export function CreditBalance({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
        <Coins className="h-3.5 w-3.5" aria-hidden />
        0
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 shadow-sm">
      <Coins className="h-4 w-4" aria-hidden />
      <span>🪙 0 Credits</span>
    </div>
  );
}
