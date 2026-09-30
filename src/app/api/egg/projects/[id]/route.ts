import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const { data: project } = await context.admin.from("egg_content_projects")
    .select("id,origin,source_type,source_data,topic_summary,status,created_at")
    .eq("id", id).eq("workspace_id", context.workspaceId).maybeSingle();
  if (!project) return NextResponse.json({ error: "找不到內容企劃" }, { status: 404 });
  const [{ data: angles }, { data: packs }, { data: recipes }] = await Promise.all([
    context.admin.from("egg_content_angles").select("id,label,premise,audience_promise,editorial_lens,rationale,risk_flags,rank,selected_at").eq("project_id", id).order("rank"),
    context.admin.from("egg_content_packs").select("id,angle_id,recipe_id,content,status,created_at,updated_at").eq("project_id", id).eq("workspace_id", context.workspaceId).order("created_at", { ascending: false }),
    context.admin.from("egg_content_recipes").select("id,name,platform,format,production_mode,config").eq("workspace_id", context.workspaceId).eq("is_active", true),
  ]);
  return NextResponse.json({ project, angles: angles ?? [], packs: packs ?? [], recipes: recipes ?? [] });
}
