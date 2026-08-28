import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { WorkspaceAccessSettings } from "@/app/(dashboard)/settings/WorkspaceAccessSettings";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

export default async function TeamPage() {
  const { user, activeWorkspace, activeRole } = await getCreatorWorkspaceContext();
  if (!user) redirect("/login?next=/team");
  if (!activeWorkspace || !activeRole) redirect("/select-workspace");

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-7 max-w-3xl">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
          <Users className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">邀請團隊成員</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          邀請經理人或團隊成員共同管理目前工作空間。每位成員只會看到獲邀加入的工作空間。
        </p>
      </header>

      <div className="max-w-4xl">
        <WorkspaceAccessSettings role={activeRole} />
      </div>
    </div>
  );
}
