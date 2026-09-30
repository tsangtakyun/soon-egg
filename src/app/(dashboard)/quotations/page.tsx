import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";
import { QuotationsClient } from "./QuotationsClient";

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { profile, activeRole } = await getActiveCreatorProfile("id");
  const params = await searchParams;
  if (!profile) return <QuotationsClient projects={[]} canApprove={false} />;
  const admin = createEggAdmin();
  const { data: projects } = await admin.from("egg_reply_projects").select("id,name,brief,updated_at,lifecycle_status,status_updated_at").eq("creator_id", profile.id).neq("lifecycle_status", "archived").order("updated_at", { ascending: false });
  return <QuotationsClient projects={projects ?? []} initialProjectId={params.projectId} canApprove={activeRole === "owner" || activeRole === "admin"} />;
}
