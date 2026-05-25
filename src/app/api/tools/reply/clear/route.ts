import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST() {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await (masterSupabase as any).from("mayan_messages").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
