import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreditBadge } from "./CreditBadge";
import { CreatorAvatar } from "./CreatorAvatar";
import { EggBrandMark } from "./EggBrandMark";
import { SidebarNav } from "./SidebarNav";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const profileResult = user && supabase
    ? await supabase
        .from("egg_creator_profiles")
        .select("display_name,username,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const profile = profileResult.data;
  const creatorName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Creator";

  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 px-4 py-5 lg:flex">
      <div className="shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <EggBrandMark compact />
        </Link>

        <Link href="/settings" className="mt-5 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-300">
          <CreatorAvatar avatarUrl={profile?.avatar_url} creatorName={creatorName} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-zinc-900">{creatorName}</span>
            <span className="block text-xs text-zinc-400">Creator 空間 · 管理檔案</span>
          </span>
        </Link>

        <div className="mt-6 px-2">
          <CreditBadge />
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
