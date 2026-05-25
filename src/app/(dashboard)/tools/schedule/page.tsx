import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import { ScheduleClient, type ScheduleItem } from "./ScheduleClient";

export default async function SchedulePage() {
  const { user, balance } = await enterTool("schedule", "進入行程中心");
  const { data } = await (masterSupabase as any)
    .from("schedules")
    .select("id, user_id, title, description, start_time, end_time, type, location, created_at")
    .eq("user_id", user.id)
    .order("start_time", { ascending: true });
  return <ScheduleClient schedules={(data ?? []) as ScheduleItem[]} balance={balance} />;
}
