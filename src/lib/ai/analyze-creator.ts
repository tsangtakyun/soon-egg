import { getAnthropic, parseJsonFromText } from "./anthropic";

export type CreatorAnalysis = {
  content_categories: string[];
  content_language: "zh-HK" | "zh-TW" | "en";
  audience_demographics: {
    primary_age: string;
    gender_split: string;
    primary_region: string;
  };
  ai_profile_summary: string;
  recommended_brands: string[];
  suggested_theme: string;
};

export const fallbackAnalysis: CreatorAnalysis = {
  content_categories: ["美食探店", "生活日常", "創作者工具", "港風文化"],
  content_language: "zh-HK",
  audience_demographics: {
    primary_age: "18-34",
    gender_split: "女性 58% / 男性 42%",
    primary_region: "香港、台灣、新加坡",
  },
  ai_profile_summary: "專注香港本地生活、美食探店與創作者變現的內容創作者",
  recommended_brands: ["餐飲平台", "旅遊體驗", "美妝零售", "食品飲料", "電商平台"],
  suggested_theme: "港風霓虹",
};

export async function analyzeCreator(input: {
  instagram_handle?: string;
  youtube_handle?: string;
  bio?: string;
  follower_counts?: { instagram?: number; youtube?: number };
}) {
  const anthropic = getAnthropic();

  if (!anthropic) {
    return fallbackAnalysis;
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `你係一個專門分析亞洲創作者嘅 AI 助理。

根據以下資料分析呢位創作者：
- Instagram: @${input.instagram_handle ?? ""} (${input.follower_counts?.instagram ?? 0} 粉絲)
- YouTube: @${input.youtube_handle ?? ""} (${input.follower_counts?.youtube ?? 0} 訂閱)
- Bio: ${input.bio ?? ""}

請用 JSON 格式回覆（只回 JSON，不要其他文字）：
{
  "content_categories": ["最多5個繁體中文類別標籤"],
  "content_language": "zh-HK 或 zh-TW 或 en",
  "audience_demographics": {
    "primary_age": "年齡層",
    "gender_split": "男女比例估計",
    "primary_region": "主要地區"
  },
  "ai_profile_summary": "一句繁體中文描述",
  "recommended_brands": ["5個最相關的亞洲品牌類別"],
  "suggested_theme": "日系清透 或 韓系黃昏 或 港風霓虹 或 台系文青 或 現代極簡"
}`,
    }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  return parseJsonFromText(text, fallbackAnalysis);
}
