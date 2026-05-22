export const PLANS = {
  free: {
    name: "免費版",
    price_hkd: 0,
    ai_credits: 30,
    features: ["Link in Bio 頁面", "Media Kit（基礎版）", "3個品牌配對/月", "基礎流量分析", "1個數位產品", "9% 交易佣金"],
  },
  creator: {
    name: "創作者版",
    price_hkd: 98,
    ai_credits: 300,
    features: ["全部免費功能", "無限品牌配對", "AI Pitch 起稿", "自動更新 Media Kit", "進階數據分析", "10個數位產品", "5% 交易佣金", "自訂域名"],
  },
  pro: {
    name: "專業版",
    price_hkd: 298,
    ai_credits: -1,
    features: ["全部創作者功能", "無限數位產品", "0% 交易佣金", "MOON AI 無限對話", "品牌合作 CRM", "電郵行銷工具", "優先客戶支援", "專屬 Account Manager"],
  },
} as const;
