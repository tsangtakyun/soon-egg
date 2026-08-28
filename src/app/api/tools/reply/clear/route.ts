import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";

export async function POST() {
  const serverSupabase = await createServerClient();
  const { data: { user } } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const { error } = await createEggAdmin().from("egg_reply_messages").delete().eq("creator_id", profile.id);
  if (error) return NextResponse.json({ error: "清空失敗，請稍後再試。" }, { status: 500 });
  return NextResponse.json({ success: true });
}
