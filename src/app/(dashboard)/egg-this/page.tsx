import { redirect } from "next/navigation";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { EggThisClient } from "./EggThisClient";

export default async function EggThisPage({
  searchParams,
}: {
  searchParams: Promise<{ input?: string; topicId?: string; mode?: string }>;
}) {
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace) redirect("/login");
  const params = await searchParams;
  return (
    <EggThisClient
      initialInput={params.input ?? ""}
      initialTopicId={params.topicId ?? ""}
      initialMode={params.mode ?? ""}
    />
  );
}
