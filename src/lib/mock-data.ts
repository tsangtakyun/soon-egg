import { ASIAN_BRANDS } from "./seed-brands";
import type { CreatorProfile, ProfileBlock, ProfileTheme } from "./types";

export const demoCreator: CreatorProfile = {
  id: "demo-creator",
  username: "soon_egg",
  display_name: "SOON-EGG",
  bio: "香港生活、美食與創作者工具分享。把靈感孵成收入。",
  avatar_url: "https://api.dicebear.com/8.x/shapes/svg?seed=SOON-EGG",
  instagram_handle: "soon_egg",
  instagram_followers: 48200,
  instagram_engagement_rate: 5.8,
  youtube_handle: "soon_egg",
  youtube_subscribers: 12600,
  youtube_avg_views: 8800,
  xiaohongshu_handle: "soon_egg",
  xiaohongshu_followers: 18600,
  tiktok_handle: "soon_egg",
  tiktok_followers: 24100,
  content_categories: ["美食探店", "生活日常", "創作者工具", "港風文化"],
  content_language: "zh-HK",
  ai_profile_summary: "專注香港生活、美食探店和創作者變現的跨平台 KOL",
  ai_credits: 300,
  plan: "creator",
};

export const demoBlocks: ProfileBlock[] = [
  { id: "block-1", block_type: "link", title: "最新香港咖啡店地圖", url: "https://sooncreator.network", is_visible: true, sort_order: 1, click_count: 1830 },
  { id: "block-2", block_type: "product", title: "Creator Media Kit 模板", url: "https://sooncreator.network/products", is_visible: true, sort_order: 2, click_count: 962 },
  { id: "block-3", block_type: "contact", title: "品牌合作查詢", url: "mailto:hello@sooncreator.network", is_visible: true, sort_order: 3, click_count: 412 },
];

export const demoThemes: ProfileTheme[] = [
  { id: "theme-neon", theme_name: "港風霓虹", background_gradient: "linear-gradient(160deg, #160b2e, #0c3b4d 48%, #ff4f7b)", text_color: "#ffffff", button_style: "rounded", button_color: "rgba(255,255,255,0.16)", font_family: "Geist, sans-serif", is_active: true },
  { id: "theme-clear", theme_name: "日系清透", background_gradient: "linear-gradient(160deg, #f5fbff, #eef7ef)", text_color: "#243034", button_style: "pill", button_color: "#ffffff", font_family: "Geist, sans-serif", is_active: false },
];

export const demoBrandMatches = ASIAN_BRANDS.slice(0, 8).map((brand, index) => ({
  brand,
  match_score: [94, 91, 88, 86, 83, 81, 78, 76][index],
  reason_zh: `${brand.name_zh || brand.name} 的 ${brand.category} 定位和 SOON-EGG 的亞洲生活內容高度吻合。`,
  collaboration_idea_zh: index % 2 === 0 ? "建議做一個短片開箱 + Story 導流的本地化內容系列。" : "建議設計一個品牌體驗日記，將產品自然放入日常場景。",
  suggested_deliverable: index % 2 === 0 ? "2 IG Reels + 4 Stories" : "1 YouTube Short + 3 IG posts",
  estimated_rate_hkd: [12800, 11000, 9800, 9200, 7600, 6800, 6200, 5600][index],
}));

export const analyticsSeries = [
  { day: "Mon", views: 3200, clicks: 680, revenue: 900 },
  { day: "Tue", views: 4100, clicks: 830, revenue: 1200 },
  { day: "Wed", views: 3800, clicks: 790, revenue: 1050 },
  { day: "Thu", views: 5200, clicks: 1120, revenue: 1680 },
  { day: "Fri", views: 6100, clicks: 1410, revenue: 2200 },
  { day: "Sat", views: 7300, clicks: 1660, revenue: 2480 },
  { day: "Sun", views: 6900, clicks: 1520, revenue: 2310 },
];
