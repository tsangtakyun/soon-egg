import type { ReactNode } from "react";
import { SOONAIPanel } from "@/components/ui/SOONAIPanel";
import { Sidebar } from "@/components/ui/Sidebar";
import { MobileDashboardNav } from "@/components/ui/MobileDashboardNav";
import { canCreateCreatorWorkspace, getCreatorWorkspaceContext } from "@/lib/creator-workspace";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, workspaces, activeWorkspace: profile } = await getCreatorWorkspaceContext();
  const creatorName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Creator";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f5]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileDashboardNav
          avatarUrl={profile?.avatar_url}
          creatorName={creatorName}
          workspaces={workspaces}
          activeWorkspaceId={profile?.id ?? null}
          canCreateWorkspace={canCreateCreatorWorkspace(user?.email)}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <SOONAIPanel />
    </div>
  );
}
