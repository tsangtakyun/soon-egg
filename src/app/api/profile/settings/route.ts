import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const authSupabase = await createClient();
  const { data: { user } = { user: null } } = authSupabase ? await authSupabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { buy_me_a_coffee_url } = await req.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await serviceSupabase
    .from("egg_creator_profiles")
    .update({ buy_me_a_coffee_url: buy_me_a_coffee_url || null })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
