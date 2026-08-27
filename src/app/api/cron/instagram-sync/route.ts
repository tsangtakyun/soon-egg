import { syncInstagramProfile, type InstagramSyncProfile } from "@/lib/instagram-sync";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Instagram daily sync is disabled because CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Instagram daily sync is missing Supabase server credentials.");
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("egg_creator_profiles")
    .select("id,user_id,instagram_access_token,instagram_user_id,audience_demographics")
    .not("instagram_access_token", "is", null)
    .not("instagram_user_id", "is", null)
    .limit(500);

  if (error) {
    console.error("Instagram daily sync could not load profiles:", error.message);
    return NextResponse.json({ error: "Could not load Instagram profiles" }, { status: 500 });
  }

  const profiles = (data ?? []) as InstagramSyncProfile[];
  const failures: Array<{ profile_id: string; error: string }> = [];
  let succeeded = 0;

  for (let index = 0; index < profiles.length; index += 5) {
    const batch = profiles.slice(index, index + 5);
    const results = await Promise.allSettled(batch.map((profile) => syncInstagramProfile(supabase, profile)));
    results.forEach((result, batchIndex) => {
      if (result.status === "fulfilled") {
        succeeded += 1;
        return;
      }
      const profileId = batch[batchIndex]?.id ?? "unknown";
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.warn(`Instagram daily sync failed for creator ${profileId}: ${message}`);
      failures.push({ profile_id: profileId, error: message });
    });
  }

  return NextResponse.json({
    ok: failures.length === 0,
    attempted: profiles.length,
    succeeded,
    failed: failures.length,
    failures,
    completed_at: new Date().toISOString(),
  });
}
