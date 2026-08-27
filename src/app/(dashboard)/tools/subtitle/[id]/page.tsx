import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";
import type { SubtitleLine, SubtitleSession } from "@/types/subtitle";
import { SubtitleSessionClient } from "./SubtitleSessionClient";

export default async function SubtitleSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: session }, { data: lines }] = await Promise.all([
    masterSupabase.from("subtitle_sessions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    masterSupabase.from("subtitle_lines").select("*").eq("session_id", id).order("line_index", { ascending: true }),
  ]);
  if (!session) notFound();

  return <SubtitleSessionClient initialSession={session as SubtitleSession} initialLines={(lines ?? []) as SubtitleLine[]} />;
}
