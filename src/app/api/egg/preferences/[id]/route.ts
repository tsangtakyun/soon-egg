import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { isActive?: boolean; confirmed?: boolean };
  const updates: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
  if (typeof body.confirmed === "boolean") {
    updates.confirmed_at = body.confirmed ? new Date().toISOString() : null;
    updates.confirmed_by = body.confirmed ? context.user.id : null;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "沒有可更新的設定" }, { status: 400 });
  const { data, error } = await context.admin.from("egg_preference_signals").update(updates)
    .eq("id", id).eq("workspace_id", context.workspaceId)
    .select("id,is_active,confirmed_at").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "找不到這項 Creator DNA 紀錄" }, { status: 404 });
  return NextResponse.json({ signal: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await context.admin.from("egg_preference_signals").delete()
    .eq("id", id).eq("workspace_id", context.workspaceId).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "找不到這項 Creator DNA 紀錄" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
