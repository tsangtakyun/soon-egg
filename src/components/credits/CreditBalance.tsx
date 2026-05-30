"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { masterSupabase } from "@/lib/supabase-master";

export function CreditBalance({ compact = false }: { compact?: boolean }) {
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.trim().toLowerCase();
    if (!email) {
      setBalance(null);
      return;
    }

    const { data } = await masterSupabase
      .from("user_credits")
      .select("balance")
      .eq("email", email)
      .maybeSingle();

    setBalance(typeof data?.balance === "number" ? data.balance : 0);
  }, []);

  useEffect(() => {
    queueMicrotask(loadBalance);

    const refresh = () => {
      if (document.visibilityState === "visible") loadBalance();
    };
    window.addEventListener("focus", loadBalance);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", loadBalance);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadBalance]);

  if (compact) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
        <Coins className="h-3.5 w-3.5" aria-hidden />
        {balance ?? "..."}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 shadow-sm">
      <Coins className="h-4 w-4" aria-hidden />
      <span>🪙 {balance ?? "..."} Credits</span>
    </div>
  );
}
