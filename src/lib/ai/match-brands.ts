import { demoBrandMatches, demoCreator } from "../mock-data";
import { ASIAN_BRANDS } from "../seed-brands";
import type { Brand, CreatorProfile } from "../types";
import { getAnthropic, parseJsonFromText } from "./anthropic";

export type BrandMatch = {
  brand_id: string;
  match_score: number;
  reason_zh: string;
  collaboration_idea_zh: string;
  suggested_deliverable: string;
  estimated_rate_hkd: number;
};

export async function matchBrands(creator: CreatorProfile = demoCreator, brands: Brand[] = ASIAN_BRANDS) {
  const anthropic = getAnthropic();
  const fallback = { matches: demoBrandMatches.slice(0, 5).map((match) => ({
    brand_id: match.brand.id,
    match_score: match.match_score,
    reason_zh: match.reason_zh,
    collaboration_idea_zh: match.collaboration_idea_zh,
    suggested_deliverable: match.suggested_deliverable,
    estimated_rate_hkd: match.estimated_rate_hkd,
  })) };

  if (!anthropic) {
    return fallback;
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `你係一個專業品牌合作配對 AI。

創作者資料：
- 內容類別：${creator.content_categories.join(", ")}
- Instagram 粉絲：${creator.instagram_followers ?? 0}
- YouTube 訂閱：${creator.youtube_subscribers ?? 0}
- 主要地區：${creator.content_language}
- 簡介：${creator.ai_profile_summary}

可用品牌列表：
${JSON.stringify(brands.map((brand) => ({ id: brand.id, name: brand.name, name_zh: brand.name_zh, category: brand.category, region: brand.region })))}

請選出最適合呢位創作者嘅 TOP 5 品牌，並給出配對分數（0-100）同埋合作理由。只回覆 JSON。`,
    }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  return parseJsonFromText<{ matches: BrandMatch[] }>(text, fallback);
}
