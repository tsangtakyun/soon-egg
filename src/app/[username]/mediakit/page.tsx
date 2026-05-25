import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type CreatorProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  pronouns?: string | null;
  location?: string | null;
  contact_email?: string | null;
  content_categories?: string[] | null;
  instagram_handle?: string | null;
  instagram_followers?: number | null;
  youtube_handle?: string | null;
  youtube_subscribers?: number | null;
  tiktok_handle?: string | null;
  tiktok_followers?: number | null;
  xiaohongshu_handle?: string | null;
  xiaohongshu_followers?: number | null;
  facebook_handle?: string | null;
  facebook_followers?: number | null;
  threads_followers?: number | null;
  mediakit_is_public?: boolean | null;
  mediakit_access_level?: string | null;
  mediakit_bg_color?: string | null;
  mediakit_text_color?: string | null;
  mediakit_accent_color?: string | null;
  mediakit_accent_text_color?: string | null;
  mediakit_font?: string | null;
  mediakit_lock_contact?: boolean | null;
  mediakit_collab_title?: string | null;
  mediakit_collab_message?: string | null;
  mediakit_total_followers_enabled?: boolean | null;
  mediakit_about_enabled?: boolean | null;
  mediakit_lock_about?: boolean | null;
  mediakit_about_title?: string | null;
  mediakit_bio?: string | null;
  mediakit_rates_enabled?: boolean | null;
  mediakit_lock_rates?: boolean | null;
  mediakit_brand_partners_enabled?: boolean | null;
  mediakit_lock_brand_partners?: boolean | null;
  mediakit_case_studies_enabled?: boolean | null;
  mediakit_lock_case_studies?: boolean | null;
  mediakit_links_enabled?: boolean | null;
};

type RateCard = {
  id: string;
  service_name: string | null;
  service_name_zh: string | null;
  platform: string | null;
  price: number | null;
  is_starting_price?: boolean | null;
};

type BrandPartner = {
  id: string;
  brand_name: string | null;
  brand_logo_url: string | null;
};

type CaseStudy = {
  id: string;
  title: string | null;
  brand_name: string | null;
  description: string | null;
  result: string | null;
  image_url: string | null;
};

type ProfileBlock = {
  id: string;
  title: string | null;
  url: string | null;
};

function blockHref(block: ProfileBlock, username: string) {
  const title = block.title?.trim() ?? "";
  const url = block.url ?? "#";

  if (title.includes("我的貨品") || title.includes("貨品") || url.includes("sooncreator.network/shop")) {
    return `https://egg.sooncreator.network/${username}/shop`;
  }

  return url;
}

function isEnabled(value: boolean | null | undefined, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function followerCount(profile: CreatorProfile) {
  return (
    Number(profile.instagram_followers ?? 0) +
    Number(profile.youtube_subscribers ?? 0) +
    Number(profile.tiktok_followers ?? 0) +
    Number(profile.xiaohongshu_followers ?? 0) +
    Number(profile.facebook_followers ?? 0) +
    Number(profile.threads_followers ?? 0)
  );
}

function fontHref(font: string) {
  const clean = font.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Poppins";
  return `https://fonts.googleapis.com/css2?family=${clean.replaceAll(" ", "+")}:wght@400;500;600;700&display=swap`;
}

function money(value: number | null | undefined) {
  return `HK$${Number(value ?? 0).toLocaleString()}`;
}

function truncate(value: string | null | undefined, length: number) {
  if (!value) return null;
  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
}

function isLightColor(hex: string) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
    </svg>
  );
}

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805ZM9.609 15.601V8.408l6.264 3.602Z" />
    </svg>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08Z" />
    </svg>
  );
}

function SocialCircle({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.2)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

export default async function PublicMediaKitPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data } = await supabase.from("egg_creator_profiles").select("*").eq("username", username).single();
  const profile = data as CreatorProfile | null;

  if (!profile || !profile.mediakit_is_public || profile.mediakit_access_level === "private") {
    notFound();
  }

  const [{ data: rateCards }, { data: brandPartners }, { data: caseStudies }, { data: blocks }] = await Promise.all([
    supabase.from("egg_rate_cards").select("*").eq("creator_id", profile.id).eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("egg_brand_partners").select("*").eq("creator_id", profile.id).order("sort_order", { ascending: true }),
    supabase.from("egg_case_studies").select("*").eq("creator_id", profile.id).order("sort_order", { ascending: true }),
    supabase
      .from("egg_profile_blocks")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true }),
  ]);

  const bgColor = profile.mediakit_bg_color ?? "#FFF5E6";
  const bodyTextColor = isLightColor(bgColor) ? "#1a1a1a" : "#f8fafc";
  const mutedTextColor = isLightColor(bgColor) ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)";
  const borderColor = isLightColor(bgColor) ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
  const accentColor = profile.mediakit_accent_color ?? "#E63946";
  const accentText = profile.mediakit_accent_text_color ?? "#FFFFFF";
  const font = profile.mediakit_font ?? "Poppins";
  const totalFollowers = followerCount(profile);
  const displayName = profile.display_name ?? profile.username;
  const contactEmail = profile.contact_email ?? "hello@sooncreator.network";
  const categories = profile.content_categories ?? [];
  const activeRateCards = (rateCards ?? []) as RateCard[];
  const activeBrandPartners = (brandPartners ?? []) as BrandPartner[];
  const activeCaseStudies = (caseStudies ?? []) as CaseStudy[];
  const activeBlocks = ((blocks ?? []) as ProfileBlock[]).filter((block) => block.title?.trim() !== "Creator Media Kit 模板");
  const tagline = truncate(profile.bio, 80);
  const hasSocials = Boolean(profile.instagram_handle || profile.youtube_handle || profile.tiktok_handle || profile.xiaohongshu_handle);
  const platformBreakdown = [
    { handle: profile.instagram_handle, count: profile.instagram_followers, label: "Instagram", icon: "IG" },
    { handle: profile.youtube_handle, count: profile.youtube_subscribers, label: "YouTube", icon: "YT" },
    { handle: profile.tiktok_handle, count: profile.tiktok_followers, label: "TikTok", icon: "TT" },
    { handle: profile.xiaohongshu_handle, count: profile.xiaohongshu_followers, label: "小紅書", icon: "紅" },
    { handle: profile.facebook_handle, count: profile.facebook_followers, label: "Facebook", icon: "FB" },
  ].filter((platform) => platform.handle);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontHref(font)} />
      <main style={{ minHeight: "100vh", background: bgColor, color: bodyTextColor, fontFamily: `${font}, sans-serif` }}>
        <header
          style={{
            position: "relative",
            width: "100%",
            minHeight: 320,
            background: profile.cover_url ? `url(${profile.cover_url}) center/cover` : accentColor,
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))" }} />
          <div
            style={{
              position: "relative",
              padding: "40px 48px",
              display: "flex",
              alignItems: "flex-end",
              gap: 24,
              minHeight: 320,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flex: 1, minWidth: 280 }}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid white", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    border: "3px solid white",
                    background: accentColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    color: "white",
                    fontWeight: 500,
                  }}
                >
                  {displayName[0]}
                </div>
              )}
              <div>
                <h1 style={{ color: "white", fontSize: 32, fontWeight: 700, margin: 0 }}>{displayName}</h1>
                {tagline && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.82)",
                      fontSize: 14,
                      margin: "6px 0 0",
                      maxWidth: 400,
                      overflow: "visible",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {tagline}
                  </p>
                )}
                {profile.pronouns && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "4px 0 0" }}>{profile.pronouns}</p>}
                {profile.location && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "2px 0 0" }}>{profile.location}</p>}

                {hasSocials && (
                  <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    {profile.instagram_handle && (
                      <SocialCircle href={`https://instagram.com/${profile.instagram_handle}`} label="Instagram">
                        <InstagramIcon />
                      </SocialCircle>
                    )}
                    {profile.youtube_handle && (
                      <SocialCircle href={`https://youtube.com/@${profile.youtube_handle}`} label="YouTube">
                        <YouTubeIcon />
                      </SocialCircle>
                    )}
                    {profile.tiktok_handle && (
                      <SocialCircle href={`https://tiktok.com/@${profile.tiktok_handle}`} label="TikTok">
                        <TikTokIcon />
                      </SocialCircle>
                    )}
                    {profile.xiaohongshu_handle && (
                      <SocialCircle href={`https://xiaohongshu.com/user/profile/${profile.xiaohongshu_handle}`} label="小紅書">
                        <span style={{ fontSize: 11, fontWeight: 700 }}>紅</span>
                      </SocialCircle>
                    )}
                  </div>
                )}

                {categories.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {categories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          border: "1px solid rgba(255,255,255,0.4)",
                          color: "white",
                          borderRadius: 50,
                          padding: "4px 12px",
                          fontSize: 12,
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!profile.mediakit_lock_contact && (
              <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 280, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#1a1a1a" }}>
                  {profile.mediakit_collab_title ?? "品牌合作查詢"}
                </h3>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px", lineHeight: 1.5 }}>
                  {profile.mediakit_collab_message ?? "歡迎發送合作邀請，我會盡快回覆！"}
                </p>
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(`品牌合作邀請 - ${displayName}`)}`}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: 12,
                    backgroundColor: accentColor,
                    color: accentText,
                    borderRadius: 50,
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  Work with me
                </a>
              </div>
            )}
          </div>
        </header>

        {isEnabled(profile.mediakit_total_followers_enabled) && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: `1px solid ${borderColor}` }}>
            <p style={{ color: mutedTextColor, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>TOTAL FOLLOWERS</p>
            <p style={{ fontSize: 48, fontWeight: 700, color: bodyTextColor, margin: "0 0 20px", fontFamily: font }}>
              {totalFollowers > 0 ? totalFollowers.toLocaleString() : "—"}
            </p>

            {platformBreakdown.length > 0 ? (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {platformBreakdown.map((platform) => (
                  <div key={platform.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: isLightColor(bgColor) ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: bodyTextColor,
                        fontWeight: 700,
                      }}
                    >
                      {platform.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: bodyTextColor, margin: 0 }}>
                        {platform.count && platform.count > 0 ? platform.count.toLocaleString() : "—"}
                      </p>
                      <p style={{ fontSize: 11, color: mutedTextColor, margin: 0 }}>{platform.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: mutedTextColor, fontSize: 13 }}>尚未連結社交平台</p>
            )}
          </section>
        )}

        {isEnabled(profile.mediakit_about_enabled) && !profile.mediakit_lock_about && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: `1px solid ${borderColor}` }}>
            <p style={{ color: mutedTextColor, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
              {profile.mediakit_about_title ?? "ABOUT ME"}
            </p>
            <p style={{ color: bodyTextColor, fontSize: 16, lineHeight: 1.8, maxWidth: 720, fontFamily: font, opacity: 1 }}>
              {profile.mediakit_bio ?? profile.bio ?? "—"}
            </p>
          </section>
        )}

        {isEnabled(profile.mediakit_rates_enabled) && !profile.mediakit_lock_rates && activeRateCards.length > 0 && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: `1px solid ${borderColor}` }}>
            <p style={{ color: mutedTextColor, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>RATES CARD</p>
            {activeRateCards.map((rate) => (
              <div
                key={rate.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: `1px solid ${borderColor}` }}
              >
                <div>
                  <p style={{ color: bodyTextColor, fontSize: 16, fontWeight: 600, margin: 0 }}>{rate.service_name_zh ?? rate.service_name}</p>
                  {rate.platform && <p style={{ color: mutedTextColor, fontSize: 13, margin: "2px 0 0" }}>{rate.platform}</p>}
                </div>
                <p style={{ color: bodyTextColor, fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {money(rate.price)}
                  {rate.is_starting_price ? "+" : ""}
                </p>
              </div>
            ))}
          </section>
        )}

        {isEnabled(profile.mediakit_brand_partners_enabled) && !profile.mediakit_lock_brand_partners && activeBrandPartners.length > 0 && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: `1px solid ${borderColor}` }}>
            <p style={{ color: mutedTextColor, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>BRAND PARTNERS</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {activeBrandPartners.map((bp) => (
                <div
                  key={bp.id}
                  style={{
                    background: isLightColor(bgColor) ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "12px 20px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: bodyTextColor,
                  }}
                >
                  {bp.brand_logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bp.brand_logo_url} style={{ height: 32, objectFit: "contain" }} alt={bp.brand_name ?? "Brand partner"} />
                  ) : (
                    bp.brand_name
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {isEnabled(profile.mediakit_case_studies_enabled) && !profile.mediakit_lock_case_studies && activeCaseStudies.length > 0 && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: `1px solid ${borderColor}` }}>
            <p style={{ color: mutedTextColor, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>PAST PROJECTS</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {activeCaseStudies.map((cs) => (
                <div
                  key={cs.id}
                  style={{
                    background: isLightColor(bgColor) ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    overflow: "hidden",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  {cs.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cs.image_url} style={{ width: "100%", height: 180, objectFit: "cover" }} alt={cs.title ?? "Case study"} />
                  )}
                  <div style={{ padding: 16 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: bodyTextColor, margin: "0 0 4px" }}>{cs.title}</p>
                    {cs.brand_name && <p style={{ fontSize: 12, color: mutedTextColor, margin: "0 0 8px" }}>{cs.brand_name}</p>}
                    {cs.description && <p style={{ fontSize: 13, color: bodyTextColor, lineHeight: 1.5, margin: "0 0 8px" }}>{cs.description}</p>}
                    {cs.result && <p style={{ fontSize: 13, fontWeight: 600, color: accentColor, margin: 0 }}>結果：{cs.result}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ background: bgColor, padding: "32px 48px" }}>
          <div style={{ maxWidth: 600, display: "flex", flexDirection: "column", gap: 12 }}>
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(`品牌合作邀請 - ${displayName}`)}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "16px 32px",
                backgroundColor: accentColor,
                color: accentText,
                borderRadius: 50,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              發送合作邀請
            </a>

            {isEnabled(profile.mediakit_links_enabled) && activeBlocks.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {activeBlocks.map((block) => (
                  <a
                    key={block.id}
                    href={blockHref(block, profile.username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "10px 20px",
                      border: `1.5px solid ${accentColor}`,
                      color: accentColor,
                      borderRadius: 50,
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: "none",
                      background: "transparent",
                    }}
                  >
                    {block.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer style={{ background: bgColor, padding: "24px 48px", textAlign: "center", borderTop: `1px solid ${borderColor}` }}>
          <p style={{ color: mutedTextColor, fontSize: 12 }}>
            Powered by{" "}
            <a href="https://egg.sooncreator.network" style={{ color: accentColor, textDecoration: "none", fontWeight: 500 }}>
              SOON-EGG
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
