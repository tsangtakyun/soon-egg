import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import type { SubtitleSession } from "@/types/subtitle";
import { SubtitleClient } from "./SubtitleClient";

export default async function SubtitlePage() {
  const { user } = await enterTool("subtitle", "進入字幕工作台");
  const { data } = await masterSupabase
    .from("subtitle_sessions")
    .select("id, created_at, title, video_url, duration_seconds, status, error_message, original_filename, original_size_bytes, compressed_size_bytes, line_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <SubtitleClient sessions={(data ?? []) as SubtitleSession[]} />;
}
