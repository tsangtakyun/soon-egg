import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import { ProductionClient, type WorkItem } from "./ProductionClient";

export default async function ProductionPage() {
  const { user, workspaceId, balance } = await enterTool("production", "進入拍攝跟進");

  const { data } = await (masterSupabase as any)
    .from("work_items")
    .select("id, title, description, status, priority, due_date, tags, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <ProductionClient workItems={(data ?? []) as WorkItem[]} workspaceId={workspaceId} balance={balance} />;
}
