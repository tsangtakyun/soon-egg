import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

export async function GET() {
  const server = await createServerClient();
  if (!server) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Campaign service is not configured" }, { status: 503 });
  const admin = createServiceClient(url, key, { auth: { persistSession: false } });
  const { profile } = await getActiveCreatorProfile("id");
  if (!profile?.id) return NextResponse.json({ applications: [] });

  const { data, error } = await admin
    .from("egg_campaign_applications")
    .select("*")
    .eq("creator_id", profile.id)
    .order("applied_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  return NextResponse.json({ applications: data || [] });
}
