import type { CSSProperties } from "react";
import {
  PublicPageClient,
  type PublicPageBlock,
  type PublicPageProfile,
  type PublicPageSection,
  type PublicRateCard,
} from "@/components/public/PublicPageClient";
import type { PublicProduct } from "@/components/public/ProductCard";
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
  "mediakit",
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

  const [{ data: blocks }, { data: theme }, followsResult, { data: products }, { data: rateCards }] = await Promise.all([
    supabase
      .from("egg_profile_blocks")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true }),
    supabase.from("egg_profile_themes").select("*").eq("creator_id", profile.id).eq("is_active", true).single(),
    supabase.from("egg_follows").select("id", { count: "exact", head: true }).eq("creator_id", profile.id),
    supabase
      .from("egg_digital_products")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("egg_rate_cards")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  await supabase.from("egg_analytics_events").insert({
    creator_id: profile.id,
    event_type: "profile_view",
    source: "direct",
  });

  const typedProfile = profile as PublicPageProfile;
  const typedTheme = theme as PublicTheme | null;
  const visibleBlocks = ((blocks ?? []) as PublicPageBlock[]).filter((block) => {
    const title = block.title?.trim().toLowerCase() || "";
    return block.is_visible !== false && title !== "creator media kit 模板".toLowerCase();
  });
  const activeProducts = (products ?? []) as PublicProduct[];
  const activeRateCards = (rateCards ?? []) as PublicRateCard[];

  const sections: PublicPageSection[] = [{ id: "hub", label: "主頁", icon: "home" }];

  if (typedProfile.contact_email || typedProfile.instagram_handle) {
    sections.push({ id: "contact", label: "品牌合作查詢", icon: "contact" });
  }

  if (activeProducts.length > 0) {
    sections.push({ id: "shop", label: "我的貨品專區", icon: "shop" });
  }

  sections.push({ id: "media-kit", label: "Media Kit", icon: "media-kit" });

  const btnColor = typedTheme?.button_color ?? "#3b82f6";
  const isRounded = (typedTheme?.button_style ?? "rounded") === "rounded";
  const btnRadius = isRounded ? "50px" : "12px";

  return (
    <PublicPageClient
      sections={sections}
      profile={typedProfile}
      blocks={visibleBlocks}
      shopBlock={null}
      products={activeProducts}
      rateCards={activeRateCards}
      followerCount={followsResult.count ?? 0}
      bgStyle={getBackgroundStyle(typedProfile, typedTheme)}
      btnColor={btnColor}
      btnRadius={btnRadius}
      textColor={typedTheme?.text_color ?? "#ffffff"}
    />
  );
}
