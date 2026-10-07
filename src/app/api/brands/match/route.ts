import { matchBrands } from "@/lib/ai/match-brands";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { creator_id } = await req.json();
    const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
    if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
    if (!creator_id || creator_id !== activeWorkspace.id) return NextResponse.json({ error: "無權存取此工作空間" }, { status: 403 });
    const previewBlock = trialPreviewAdmissionResponse();
    if (previewBlock) return previewBlock;
    const [{ data: creator, error: creatorError }, { data: brands, error: brandError }] = await Promise.all([
      admin.from("egg_creator_profiles").select("*").eq("id", activeWorkspace.id).single(),
      admin.from("egg_brands").select("*"),
    ]);
    if (creatorError || !creator) return NextResponse.json({ error: "找不到創作者資料" }, { status: 404 });
    if (brandError) throw brandError;
    if (!brands?.length) return NextResponse.json({ matches: [], message: "暫時未有可配對品牌" });

    const { matches } = await matchBrands(creator, brands);

    for (const match of matches) {
        await admin.from("egg_brand_deals").upsert({
          creator_id,
          brand_id: match.brand_id,
          status: "prospecting",
          ai_match_score: match.match_score,
          notes: match.reason_zh,
          proposed_rate: match.estimated_rate_hkd,
          currency: "HKD",
        });
    }

    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}
