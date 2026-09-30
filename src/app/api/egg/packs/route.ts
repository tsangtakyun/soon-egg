import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";

export async function GET(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  // A pack can contain up to 250 KB of editable content. Returning 20–30 full
  // packs can exceed the serverless response limit, leaving the browser with a
  // truncated body that cannot be parsed as JSON. Keep the recent-history
  // payload bounded while still returning enough items for the horizontal list.
  const limit = Number.isFinite(requestedLimit) ? Math.min(8, Math.max(1, Math.floor(requestedLimit))) : 8;
  const { data, error } = await context.admin.from("egg_content_packs")
    .select("id,project_id,recipe_id,content,status,edited_at,edit_count,approval_status,approved_by_role,approved_at,approval_method,approved_content_hash,created_at,updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[egg packs] history failed", error);
    return NextResponse.json({ error: "暫時未能載入內容紀錄" }, { status: 500 });
  }
  return NextResponse.json({ packs: data ?? [] });
}
