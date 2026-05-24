import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logDealActivity } from "@/lib/deals-activity";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-soon-api-key");
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service role env is missing" }, { status: 500 });
  }

  const body = await req.json();
  const { creator_username, cw_brief_id, ...rest } = body;

  if (!creator_username || !cw_brief_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("id")
    .eq("username", creator_username)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const payload = {
    creator_id: profile.id,
    cw_brief_id,
    ...rest,
    status: "received",
    received_at: new Date().toISOString(),
  };

  const { data: existingBrief } = await supabase
    .from("egg_project_briefs")
    .select("id")
    .eq("cw_brief_id", cw_brief_id)
    .maybeSingle();

  const { error } = existingBrief?.id
    ? await supabase.from("egg_project_briefs").update(payload).eq("id", existingBrief.id)
    : await supabase.from("egg_project_briefs").insert(payload);

  if (error) {
    console.error("Brief receive error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logDealActivity({
    type: "brief_received",
    title: `📋 ${creator_username} 收到 Project Brief`,
    body: `${body.title ?? rest.title ?? ""} · 品牌：${body.brand_name ?? rest.brand_name ?? ""}`,
    meta: {
      creator_username,
      creator_mediakit_url: `https://egg.sooncreator.network/${creator_username}/mediakit`,
      brief_title: body.title ?? rest.title ?? null,
      brand_name: body.brand_name ?? rest.brand_name ?? null,
      brand_website: body.brand_website ?? rest.brand_website ?? null,
      cw_workspace_id: body.cw_workspace_id ?? rest.cw_workspace_id ?? null,
      deliverables: body.deliverables ?? rest.deliverables ?? null,
      budget: body.budget ?? rest.budget ?? null,
      timeline: body.timeline ?? rest.timeline ?? null,
      dos: body.dos ?? rest.dos ?? null,
      donts: body.donts ?? rest.donts ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
