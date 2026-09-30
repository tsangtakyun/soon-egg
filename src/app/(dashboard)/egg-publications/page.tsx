import { redirect } from "next/navigation";

import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { PublicationMatcher } from "./PublicationMatcher";

export default async function EggPublicationsPage() {
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace) redirect("/login");
  return <PublicationMatcher />;
}
