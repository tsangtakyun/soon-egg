import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import { ReplyClient, type MayanMessage } from "./ReplyClient";

export default async function ReplyPage() {
  const { user, balance } = await enterTool("reply", "進入回覆中心");

  const { data: messages } = await (masterSupabase as any)
    .from("mayan_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(20);

  return <ReplyClient messages={(messages ?? []) as MayanMessage[]} balance={balance} userEmail={user.email} />;
}
