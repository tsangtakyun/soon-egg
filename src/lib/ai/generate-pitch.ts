import { demoCreator } from "../mock-data";
import { ASIAN_BRANDS } from "../seed-brands";
import type { Brand, CreatorProfile } from "../types";
import { getAnthropic } from "./anthropic";

export async function generatePitch({
  creator = demoCreator,
  brand = ASIAN_BRANDS[0],
  language = "zh-HK",
}: {
  creator?: CreatorProfile;
  brand?: Brand;
  language?: "zh-HK" | "zh-TW" | "en";
}) {
  const anthropic = getAnthropic();

  if (!anthropic) {
    return `你好 ${brand.name_zh || brand.name} 團隊，

我是 ${creator.display_name}，主要創作${creator.content_categories.join("、")}內容，目前 Instagram 約 ${creator.instagram_followers?.toLocaleString()} 粉絲，平均互動率 ${creator.instagram_engagement_rate}%。

我留意到 ${brand.name_zh || brand.name} 在${brand.category}領域和我的受眾有很自然的交集，尤其適合以短片和限時動態展示產品在日常生活中的使用場景。

建議合作形式：2 支 Reels、4 則 Story，以及一組可追蹤連結，讓品牌同時獲得內容曝光和成效數據。

期待可以安排 15 分鐘簡短通話，了解你們今季的推廣重點。謝謝。`;
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `你係一個專業 KOL 經紀人，請幫呢位創作者寫一封品牌合作 pitch 電郵。

創作者：${creator.display_name}
- Instagram: ${creator.instagram_followers ?? 0} 粉絲，互動率 ${creator.instagram_engagement_rate ?? 0}%
- YouTube: ${creator.youtube_subscribers ?? 0} 訂閱
- 內容定位：${creator.ai_profile_summary}

目標品牌：${brand.name_zh || brand.name}（${brand.category}）

語言：${language === "zh-HK" ? "廣東話書面語（繁體中文）" : language === "zh-TW" ? "台灣繁體中文" : "英文"}

請寫一封專業但有溫度嘅 pitch 電郵，包括自我介紹、品牌適配、建議合作形式和 call to action。只回覆電郵內文。`,
    }],
  });

  return response.content[0]?.type === "text" ? response.content[0].text : "";
}
