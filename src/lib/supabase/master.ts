import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getMasterSupabase() {
  if (client) return client;

  const url = process.env.SOON_CORE_SUPABASE_URL;
  const serviceKey = process.env.SOON_CORE_SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SOON Core Supabase env vars are missing");
  }

  console.log("[master] key prefix:", serviceKey.substring(0, 30));

  client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

export const masterSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = getMasterSupabase()[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(getMasterSupabase()) : value;
  },
});
