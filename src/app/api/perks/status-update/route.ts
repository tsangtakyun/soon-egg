import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type StatusUpdateBody = {
  perk_id?: string;
  creator_username?: string;
  status?: string;
  brand_notes?: string | null;
};

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-soon-api-key");
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { perk_id, creator_username, status, brand_notes } = (await req.json()) as StatusUpdateBody;

  if (!perk_id || !creator_username || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("egg_creator_profiles")
    .select("id")
    .eq("username", creator_username)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("perk_claims")
    .update({ status, brand_notes: brand_notes ?? null, updated_at: new Date().toISOString() })
    .eq("perk_id", perk_id)
    .eq("creator_id", profile.id);

  if (error) {
    console.error("[perks/status-update] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
