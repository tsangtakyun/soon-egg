import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;
let adminClient: SupabaseClient | null | undefined;

export function getMasterSupabase() {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_MASTER_SUPABASE_URL || process.env.SOON_CORE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_MASTER_SUPABASE_ANON_KEY;
  browserClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return browserClient;
}

// Server-side only. Use this from API routes / server helpers, never client components.
export function getMasterSupabaseAdmin() {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.NEXT_PUBLIC_MASTER_SUPABASE_URL || process.env.SOON_CORE_SUPABASE_URL;
  const key = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.SOON_CORE_SUPABASE_SERVICE_KEY;
  adminClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return adminClient;
}
