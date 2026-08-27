import type { ReactNode } from "react";
import { SOONAIPanel } from "@/components/ui/SOONAIPanel";
import { Sidebar } from "@/components/ui/Sidebar";
import { MobileDashboardNav } from "@/components/ui/MobileDashboardNav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } = user && supabase
    ? await supabase
        .from("egg_creator_profiles")
        .select("display_name,username,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const creatorName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Creator";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f5]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileDashboardNav avatarUrl={profile?.avatar_url} creatorName={creatorName} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <SOONAIPanel />
    </div>
  );
}
