import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import { SubtitleClient, type SubtitleSession } from "./SubtitleClient";

export default async function SubtitlePage() {
  const { user, balance } = await enterTool("subtitle", "進入字幕工作台");
  const { data } = await (masterSupabase as any)
    .from("subtitle_sessions")
    .select("id, title, language, srt_content, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <SubtitleClient sessions={(data ?? []) as SubtitleSession[]} balance={balance} />;
}
