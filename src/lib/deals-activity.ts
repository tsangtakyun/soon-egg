import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let coreSupabase: SupabaseClient | null = null;

function getCoreSupabase() {
  if (coreSupabase) return coreSupabase;

  const url = process.env.SOON_CORE_SUPABASE_URL;
  const serviceKey = process.env.SOON_CORE_SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    console.error("[deals-activity] SOON Core Supabase env vars are missing");
    return null;
  }

  coreSupabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return coreSupabase;
}

export async function logDealActivity({
  type,
  title,
  body,
  meta,
}: {
  type: string;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const supabase = getCoreSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from("deals_activities")
      .insert({ type, title, body: body ?? null, meta: meta ?? {}, is_read: false });

    if (error) throw error;
  } catch (err) {
    console.error("[deals-activity] log failed:", err);
  }
}
