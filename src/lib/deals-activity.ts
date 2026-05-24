import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type DealActivityInput = {
  type: string;
  title: string;
  body?: string | null;
  meta?: Record<string, unknown>;
};

let coreSupabase: SupabaseClient | null = null;

function getCoreSupabase() {
  if (coreSupabase) return coreSupabase;

  const url = process.env.SOON_CORE_SUPABASE_URL || process.env.NEXT_PUBLIC_SOON_CORE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SOON_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SOON_CORE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn("[deals-activity] SOON Core Supabase env vars are missing");
    return null;
  }

  coreSupabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return coreSupabase;
}

export async function logDealActivity({ type, title, body, meta }: DealActivityInput) {
  try {
    const supabase = getCoreSupabase();
    if (!supabase) return;

    const { error } = await supabase.from("deals_activities").insert({
      type,
      title,
      body: body ?? null,
      meta: meta ?? {},
      is_read: false,
    });

    if (error) throw error;
  } catch (err) {
    console.error("[deals-activity] log failed:", err);
  }
}
