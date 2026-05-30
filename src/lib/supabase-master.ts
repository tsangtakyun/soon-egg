import { createClient } from "@supabase/supabase-js";

const masterUrl = process.env.NEXT_PUBLIC_MASTER_SUPABASE_URL || process.env.SOON_CORE_SUPABASE_URL;
const masterAnonKey =
  process.env.NEXT_PUBLIC_MASTER_SUPABASE_ANON_KEY ||
  process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SOON_CORE_SUPABASE_SERVICE_KEY;
const masterServiceKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.SOON_CORE_SUPABASE_SERVICE_KEY;

if (!masterUrl || !masterAnonKey) {
  throw new Error("Master Supabase env vars are missing");
}

export const masterSupabase = createClient(masterUrl, masterAnonKey, {
  auth: { persistSession: false },
});

// Server-side only. Use this from API routes / server helpers, never client components.
export const masterSupabaseAdmin = createClient(masterUrl, masterServiceKey || masterAnonKey, {
  auth: { persistSession: false },
});
