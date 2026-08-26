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
  const [balance, profileResult] = await Promise.all([
    user?.email ? getCreditBalance(user.email) : Promise.resolve(0),
    user && supabase
      ? supabase
          .from("egg_creator_profiles")
          .select("display_name,username,avatar_url")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const profile = profileResult.data;
  const creatorName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Creator";

  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 px-4 py-5 lg:flex">
      <div className="shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soon-egg.png" alt="SOON-EGG" className="h-7 w-auto object-contain" />
        </Link>

        <Link href="/settings" className="mt-5 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-300">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full bg-zinc-100 object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              {creatorName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-zinc-900">{creatorName}</span>
            <span className="block text-xs text-zinc-400">創作者帳戶</span>
          </span>
        </Link>

        <div className="mt-6 px-2">
          <CreditBadge credits={balance} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <SidebarNav />
      </div>

      <div className="shrink-0 border-t border-zinc-200 pt-4">
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
