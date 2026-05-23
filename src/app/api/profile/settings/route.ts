import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const authSupabase = await createClient();
  const { data: { user } = { user: null } } = authSupabase ? await authSupabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { buy_me_a_coffee_url, cover_url } = body;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const updates: { buy_me_a_coffee_url?: string | null; cover_url?: string | null } = {};

  if ("buy_me_a_coffee_url" in body) {
    updates.buy_me_a_coffee_url = buy_me_a_coffee_url || null;
  }

  if (typeof cover_url === "string") {
    updates.cover_url = cover_url;
  }

  const { error } = await serviceSupabase.from("egg_creator_profiles").update(updates).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
