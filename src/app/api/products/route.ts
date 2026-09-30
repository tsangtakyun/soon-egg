import { NextResponse } from "next/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

const PRODUCT_FIELDS = [
  "title", "description", "price", "currency", "product_type", "external_url",
  "thumbnail_url", "is_unlimited_stock", "stock", "is_active",
] as const;

function productPayload(input: Record<string, unknown>) {
  return Object.fromEntries(PRODUCT_FIELDS.filter((key) => key in input).map((key) => [key, input[key]]));
}

export async function GET() {
  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [products, orders] = await Promise.all([
    admin.from("egg_digital_products").select("*").eq("creator_id", activeWorkspace.id).eq("is_archived", false).order("created_at", { ascending: false }),
    admin.from("egg_product_orders").select("*").eq("creator_id", activeWorkspace.id).order("created_at", { ascending: false }),
  ]);
  const error = products.error || orders.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspaceId: activeWorkspace.id, role: activeWorkspace.role, products: products.data ?? [], orders: orders.data ?? [] });
}

export async function POST(request: Request) {
  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const payload = productPayload(body);
  if (typeof payload.title !== "string" || !payload.title.trim()) return NextResponse.json({ error: "請填寫產品名稱" }, { status: 400 });
  const { data, error } = await admin.from("egg_digital_products").insert({ ...payload, title: payload.title.trim(), creator_id: activeWorkspace.id, is_archived: false }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ product: data }, { status: 201 });
}
