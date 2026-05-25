import Link from "next/link";
import { LogOut, Settings, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credits";
import { CreditBadge } from "./CreditBadge";
import { SidebarNav } from "./SidebarNav";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const balance = user?.email ? await getCreditBalance(user.email) : 0;

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-zinc-200 bg-zinc-50/80 px-4 py-5 lg:block">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/soon-egg.png" alt="SOON-EGG" className="h-7 w-auto object-contain" />
      </Link>

      <div className="mt-6 px-2">
        <CreditBadge credits={balance} />
      </div>

      <SidebarNav />

      <div className="mt-8 border-t border-zinc-200 pt-4">
        <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-white">
          <Settings className="h-4 w-4" aria-hidden />
          設定
        </Link>
        <Link href="/credits" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-white">
          <Zap className="h-4 w-4" aria-hidden />
          Credits
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-white">
            <LogOut className="h-4 w-4" aria-hidden />
            登出
          </button>
        </form>
      </div>
    </aside>
  );
}
