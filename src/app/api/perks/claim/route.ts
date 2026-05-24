import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type PerkClaimBody = {
  perk_id?: string;
  type?: "service" | "product";
  preferred_date?: string | null;
  preferred_time?: string | null;
  party_size?: number | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_district?: string | null;
  delivery_notes?: string | null;
};

function missingColumnName(message?: string) {
  const match = message?.match(/'([^']+)' column/);
  return match?.[1] ?? null;
}

async function insertLocalPerkClaim(payload: Record<string, unknown>) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabaseAdmin.from("perk_claims").insert(nextPayload);

    if (!error) return;

    const column = missingColumnName(error.message);
    if (!column || !(column in nextPayload)) {
      throw error;
    }

    console.warn(`[perks/claim] local perk_claims missing column "${column}", retrying without it`);
    const { [column]: _removed, ...rest } = nextPayload;
    nextPayload = rest;
  }
}

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as PerkClaimBody;
  if (!body.perk_id || !body.type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("id, username, display_name")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const claimPayload = {
    perk_id: body.perk_id,
    creator_id: profile.id,
    creator_username: profile.username,
    type: body.type,
    preferred_date: body.preferred_date ?? null,
    preferred_time: body.preferred_time ?? null,
    party_size: body.party_size ?? 1,
    delivery_name: body.delivery_name ?? null,
    delivery_phone: body.delivery_phone ?? null,
    delivery_address: body.delivery_address ?? null,
    delivery_district: body.delivery_district ?? null,
    delivery_notes: body.delivery_notes ?? null,
    status: "pending",
  };

  try {
    await insertLocalPerkClaim(claimPayload);
  } catch (localError) {
    console.error("SOON-EGG perk claim insert skipped:", localError);
  }

  const cwRes = await fetch(`${process.env.CW_BASE_URL}/api/public/perks/claim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-soon-api-key": process.env.SOON_INTERNAL_API_KEY!,
    },
    body: JSON.stringify({
      ...body,
      creator_username: profile.username,
      creator_display_name: profile.display_name,
      creator_mediakit_url: `https://egg.sooncreator.network/${profile.username}/mediakit`,
    }),
  });

  const cwData = await cwRes.json().catch(() => null);
  if (!cwRes.ok) {
    console.error("CW perk claim failed:", cwRes.status, cwData);
    return NextResponse.json({ error: "CW sync failed", detail: cwData }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
