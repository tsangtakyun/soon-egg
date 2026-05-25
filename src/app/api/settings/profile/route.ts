import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getSupabaseAdmin() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { display_name, bio, content_categories, avatar_url } = body;

  const { error } = await getSupabaseAdmin()
    .from("egg_creator_profiles")
    .update({
      display_name: typeof display_name === "string" ? display_name.trim() : "",
      bio: typeof bio === "string" && bio.trim() ? bio.trim() : null,
      content_categories: Array.isArray(content_categories)
        ? content_categories.filter((category): category is string => typeof category === "string")
        : [],
      avatar_url: typeof avatar_url === "string" && avatar_url ? avatar_url : null,
    })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
