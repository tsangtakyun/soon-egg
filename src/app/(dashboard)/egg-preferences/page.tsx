import { redirect } from "next/navigation";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { EggPreferencesClient } from "./EggPreferencesClient";

export default async function EggPreferencesPage() {
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace) redirect("/login");
  return <EggPreferencesClient />;
}
