import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

let supabaseAdminClient: ReturnType<typeof createSupabaseClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return supabaseAdminClient;
}

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { order_id, status, tracking_number } = await req.json();
  if (!order_id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const supabaseAdmin = getSupabaseAdmin() as any;
  const { data: profile } = await supabaseAdmin.from("egg_creator_profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("egg_product_orders")
    .update({
      status,
      tracking_number: tracking_number ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order_id)
    .eq("creator_id", profile.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
