import { redirect } from "next/navigation";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { MetaAdsClient } from "./MetaAdsClient";

export default async function MetaAdsPage() {
  const { user, activeWorkspace, activeRole } = await getCreatorWorkspaceContext();
  if (!user) redirect("/login?next=/meta-ads");
  if (!activeWorkspace) redirect("/select-workspace");
  return <MetaAdsClient workspaceName={activeWorkspace.display_name || activeWorkspace.username} canManage={activeRole === "owner" || activeRole === "admin"} />;
}
