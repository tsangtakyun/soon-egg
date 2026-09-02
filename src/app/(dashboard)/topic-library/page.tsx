import { redirect } from "next/navigation";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { listTopicIdeas } from "@/lib/topic-library";
import { TopicLibraryClient } from "./TopicLibraryClient";
import { isEggPlatformAdmin } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

export default async function TopicLibraryPage() {
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace) redirect("/login");
  return <TopicLibraryClient initialIdeas={await listTopicIdeas(activeWorkspace.id)} isOwner={activeWorkspace.role === "owner"} canDelete={isEggPlatformAdmin(user.email)} />;
}
