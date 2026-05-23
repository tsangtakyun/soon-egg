export type Region = "HK" | "TW" | "SG" | "MY" | "CN" | "JP";

export type Brand = {
  id: string;
  name: string;
  name_zh?: string;
  category: string;
  region: Region[];
  min_followers?: number;
  commission_rate?: number;
  description_zh?: string;
  logo_url?: string;
  is_verified?: boolean;
};

export type CreatorProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  instagram_handle?: string;
  instagram_followers?: number;
  instagram_engagement_rate?: number;
  youtube_handle?: string;
  youtube_subscribers?: number;
  youtube_avg_views?: number;
  xiaohongshu_handle?: string;
  xiaohongshu_followers?: number;
  tiktok_handle?: string;
  tiktok_followers?: number;
  content_categories: string[];
  content_language: "zh-HK" | "zh-TW" | "zh-CN" | "en";
  ai_profile_summary: string;
  ai_credits: number;
  plan: "free" | "creator" | "pro";
};

export type ProfileBlock = {
  id: string;
  block_type: "header" | "link" | "social" | "product" | "contact";
  title: string;
  url?: string;
  thumbnail_url?: string;
  is_visible: boolean;
  sort_order: number;
  click_count?: number;
};

export type ProfileTheme = {
  id: string;
  theme_name: string;
  background_image?: string;
  background_color?: string;
  background_gradient?: string;
  text_color: string;
  button_style: "rounded" | "square" | "pill";
  button_color: string;
  font_family: string;
  is_active: boolean;
};
