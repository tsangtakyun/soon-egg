import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { ensureDefaultRecipes } from "@/lib/egg-content";

export async function GET(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  try {
    return NextResponse.json({ recipes: await ensureDefaultRecipes(context.admin, context.workspaceId, context.user.id) });
  } catch (error) {
    console.error("[egg recipes] load failed", error);
    return NextResponse.json({ error: "未能載入內容做法" }, { status: 500 });
  }
}
