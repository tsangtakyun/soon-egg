import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

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
  const allowedStatuses = new Set(["paid", "processing", "shipped", "delivered", "cancelled"]);
  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin() as any;
  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: updatedOrder, error } = await supabaseAdmin
    .from("egg_product_orders")
    .update({
      status,
      tracking_number: tracking_number ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order_id)
    .eq("creator_id", profile.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updatedOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
