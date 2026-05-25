import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import { DocsClient, type Doc } from "./DocsClient";

export default async function DocsPage() {
  const { user, workspaceId, balance } = await enterTool("docs", "進入文件中心");
  const { data } = await (masterSupabase as any)
    .from("docs")
    .select("id, user_id, workspace_id, title, content, type, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  return <DocsClient docs={(data ?? []) as Doc[]} workspaceId={workspaceId} balance={balance} />;
}
