import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CONTACT_VISIBLE_STATUSES = new Set(["confirmed", "in_progress", "completed"]);

export async function GET() {
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("id,username")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: claims, error: claimsError } = await supabaseAdmin
    .from("perk_claims")
    .select("id,perk_id,creator_id,creator_username,status,preferred_date,preferred_time,party_size,delivery_address,delivery_district,brand_notes,updated_at")
    .eq("creator_id", profile.id)
    .order("updated_at", { ascending: false });

  if (claimsError) {
    console.error("[perks/mine] claims query failed", claimsError);
    return NextResponse.json({ error: "Unable to load perk claims" }, { status: 500 });
  }

  const perkIds = Array.from(new Set((claims ?? []).map((claim) => claim.perk_id).filter((id): id is string => Boolean(id))));
  const contactPerkIds = Array.from(new Set(
    (claims ?? [])
      .filter((claim) => CONTACT_VISIBLE_STATUSES.has(claim.status ?? ""))
      .map((claim) => claim.perk_id)
      .filter((id): id is string => Boolean(id))
  ));

  const [publicPerksResult, contactsResult] = await Promise.all([
    perkIds.length
      ? supabaseAdmin
          .from("brand_perks_public")
          .select("id,title,type,description,brand_name,brand_website,brand_logo_url,requirements,quota,claimed_count,valid_until,is_active")
          .in("id", perkIds)
      : Promise.resolve({ data: [], error: null }),
    contactPerkIds.length
      ? supabaseAdmin
          .from("brand_perks")
          .select("id,contact_name,contact_phone,contact_email")
          .in("id", contactPerkIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (publicPerksResult.error || contactsResult.error) {
    console.error("[perks/mine] perk query failed", publicPerksResult.error || contactsResult.error);
    return NextResponse.json({ error: "Unable to load perk details" }, { status: 500 });
  }

  const publicPerks = new Map((publicPerksResult.data ?? []).map((perk) => [perk.id, perk]));
  const contacts = new Map((contactsResult.data ?? []).map((contact) => [contact.id, contact]));

  return NextResponse.json({
    claims: (claims ?? []).map((claim) => ({
      ...claim,
      brand_perks: {
        ...(publicPerks.get(claim.perk_id) ?? {}),
        ...(CONTACT_VISIBLE_STATUSES.has(claim.status ?? "") ? contacts.get(claim.perk_id) ?? {} : {}),
      },
    })),
  });
}

