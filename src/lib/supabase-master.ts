import { createClient } from "@supabase/supabase-js";

const masterUrl = process.env.NEXT_PUBLIC_MASTER_SUPABASE_URL!;
const masterAnonKey = process.env.NEXT_PUBLIC_MASTER_SUPABASE_ANON_KEY!;

export const masterSupabase = createClient(masterUrl, masterAnonKey);

// Server-side only. Use this from API routes / server helpers, never client components.
export const masterSupabaseAdmin = createClient(
  masterUrl,
  process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
