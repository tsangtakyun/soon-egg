import { redirect } from "next/navigation";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { EggDailyClient } from "./EggDailyClient";

export default async function EggDailyPage() {
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace) redirect("/login");
  return <EggDailyClient />;
}
