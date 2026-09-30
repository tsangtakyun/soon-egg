import { NextResponse } from "next/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

const ALLOWED = new Set(["title", "description", "price", "currency", "product_type", "external_url", "thumbnail_url", "is_unlimited_stock", "stock", "is_active"]);

async function contextOrResponse() {
  const context = await getCreatorWorkspaceContext();
  if (!context.user || !context.activeWorkspace || !context.admin) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { context };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await contextOrResponse();
  if ("response" in resolved) return resolved.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const updates = Object.fromEntries(Object.entries(body).filter(([key]) => ALLOWED.has(key)));
  const { data, error } = await resolved.context.admin.from("egg_digital_products").update(updates).eq("id", id).eq("creator_id", resolved.context.activeWorkspace.id).eq("is_archived", false).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "找不到貨品" }, { status: 404 });
  return NextResponse.json({ product: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await contextOrResponse();
  if ("response" in resolved) return resolved.response;
  const { id } = await params;
  const { data, error } = await resolved.context.admin.from("egg_digital_products").update({ is_archived: true, is_active: false }).eq("id", id).eq("creator_id", resolved.context.activeWorkspace.id).eq("is_archived", false).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "找不到貨品" }, { status: 404 });
  return NextResponse.json({ success: true });
}
