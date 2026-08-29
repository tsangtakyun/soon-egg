import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const statuses = [
  "pending",
  "applied",
  "accepted",
  "in_progress",
  "completed",
  "declined",
] as const;

export async function POST(req: Request) {
  if (req.headers.get("x-soon-api-key") !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    campaign_id?: string;
    creator_id?: string;
    status?: string;
  } | null;
  if (
    !body?.campaign_id ||
    !body.creator_id ||
    !statuses.includes(body.status as (typeof statuses)[number])
  ) {
    return NextResponse.json(
      { error: "Invalid status update" },
      { status: 400 },
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 },
    );
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("egg_campaign_applications")
    .update({ status: body.status })
    .eq("creator_id", body.creator_id)
    .eq("cw_campaign_id", body.campaign_id)
    .select("id,status,creator_id,brand_name")
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 },
    );
  if (body.status === "completed" && data.brand_name) {
    const { data: existing } = await supabase
      .from("egg_brand_partners")
      .select("id")
      .eq("creator_id", data.creator_id)
      .eq("brand_name", data.brand_name)
      .maybeSingle();
    if (!existing) {
      const { error: partnerError } = await supabase
        .from("egg_brand_partners")
        .insert({ creator_id: data.creator_id, brand_name: data.brand_name });
      if (partnerError)
        console.error(
          "Completed deal partner sync failed",
          partnerError.message,
        );
    }
  }
  return NextResponse.json({ success: true, application: data });
}
