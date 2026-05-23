import type { CSSProperties } from "react";
import {
  PublicPageClient,
  type PublicPageBlock,
  type PublicPageProfile,
  type PublicPageSection,
} from "@/components/public/PublicPageClient";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const RESERVED_ROUTES = [
  "dashboard",
  "profile",
  "login",
  "signup",
  "onboarding",
  "media-kit",
  "brand-deals",
  "brands",
  "analytics",
  "settings",
  "products",
  "api",
  "auth",
];

type PublicTheme = {
  background_image: string | null;
  background_gradient: string | null;
  background_color: string | null;
  button_color: string | null;
  button_style: string | null;
  text_color: string | null;
};

function getBackgroundStyle(profile: PublicPageProfile, theme: PublicTheme | null): CSSProperties {
  if (profile.cover_url) {
    return {
      backgroundImage: `url(${profile.cover_url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  if (theme?.background_image) {
    return {
      backgroundImage: `url(${theme.background_image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  if (theme?.background_gradient) {
    return { background: theme.background_gradient };
  }

  return { backgroundColor: theme?.background_color ?? "#87CEEB" };
}

function isShopBlock(block: PublicPageBlock) {
  const title = block.title?.toLowerCase() || "";
  return (
    block.block_type === "product" ||
    title.includes("shop") ||
    title.includes("store") ||
    title.includes("product") ||
    title.includes("貨品") ||
    title.includes("產品") ||
    title.includes("商品")
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (RESERVED_ROUTES.includes(username)) notFound();

  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("*")
    .eq("username", username)
    .eq("is_public", true)
    .single();

  if (!profile) notFound();

  const [{ data: blocks }, { data: theme }, followsResult] = await Promise.all([
    supabase
      .from("egg_profile_blocks")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("egg_profile_themes")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("is_active", true)
      .single(),
    supabase
      .from("egg_follows")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", profile.id),
  ]);

  await supabase.from("egg_analytics_events").insert({
    creator_id: profile.id,
    event_type: "profile_view",
    source: "direct",
  });

  const typedProfile = profile as PublicPageProfile;
  const typedTheme = theme as PublicTheme | null;
  const visibleBlocks = ((blocks ?? []) as PublicPageBlock[]).filter((block) => block.is_visible !== false);
  const shopBlock = visibleBlocks.find(isShopBlock) ?? null;
  const linkBlocks = visibleBlocks.filter((block) => block.id !== shopBlock?.id);
  const sections: PublicPageSection[] = [{ id: "hub", label: "主頁", icon: "⌂" }];

  if (typedProfile.youtube_handle && typedProfile.youtube_latest_video_id) {
    sections.push({ id: "video", label: "最新影片", icon: "▶" });
  }

  if (linkBlocks.length > 0) {
    sections.push({ id: "links", label: "我的連結", icon: "🔗" });
  }

  if (shopBlock) {
    sections.push({ id: "shop", label: "我的貨品專區", icon: "🛍️" });
  }

  if (typedProfile.buy_me_a_coffee_url) {
    sections.push({ id: "coffee", label: "Buy Me A Coffee", icon: "☕" });
  }

  sections.push({ id: "cta", label: "Media Kit", icon: "📋" });

  const btnColor = typedTheme?.button_color ?? "#3b82f6";
  const textColor = typedTheme?.text_color ?? "#ffffff";
  const isRounded = (typedTheme?.button_style ?? "rounded") === "rounded";
  const btnRadius = isRounded ? "50px" : "12px";

  return (
    <PublicPageClient
      sections={sections}
      profile={typedProfile}
      blocks={linkBlocks}
      shopBlock={shopBlock}
      followerCount={followsResult.count ?? 0}
      bgStyle={getBackgroundStyle(typedProfile, typedTheme)}
      btnColor={btnColor}
      btnRadius={btnRadius}
      textColor={textColor}
    />
  );
}
