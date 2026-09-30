import { generatePitch } from "@/lib/ai/generate-pitch";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
    if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
    const { data: creator, error: creatorError } = await admin.from("egg_creator_profiles").select("*").eq("id", activeWorkspace.id).single();
    if (creatorError || !creator) return NextResponse.json({ error: "找不到創作者資料" }, { status: 404 });
    if (!body.brand) return NextResponse.json({ error: "請先選擇品牌" }, { status: 400 });
    const pitch = await generatePitch({
      creator,
      brand: body.brand,
      language: body.language ?? "zh-HK",
    });

    return NextResponse.json({ pitch });
  } catch {
    return NextResponse.json({ error: "Pitch generation failed" }, { status: 500 });
  }
}
