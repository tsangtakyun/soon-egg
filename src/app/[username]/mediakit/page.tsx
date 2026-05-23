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
  mediakit_links_title?: string | null;
  mediakit_links_subtitle?: string | null;
  mediakit_links_layout?: string | null;
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
  const textColor = profile.mediakit_text_color ?? "#1a1a1a";
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
  const activeBlocks = (blocks ?? []) as ProfileBlock[];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontHref(font)} />
      <main style={{ minHeight: "100vh", background: bgColor, color: textColor, fontFamily: `${font}, sans-serif` }}>
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
                {profile.pronouns && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "4px 0 0" }}>{profile.pronouns}</p>}
                {profile.location && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "2px 0 0" }}>{profile.location}</p>}
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
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>TOTAL FOLLOWERS</p>
            <p style={{ fontSize: 48, fontWeight: 700, color: textColor, margin: "0 0 16px" }}>{totalFollowers.toLocaleString()}</p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {profile.instagram_handle && Number(profile.instagram_followers ?? 0) > 0 && (
                <span style={{ color: textColor, fontSize: 14 }}>@{profile.instagram_handle} · {Number(profile.instagram_followers).toLocaleString()}</span>
              )}
              {profile.youtube_handle && Number(profile.youtube_subscribers ?? 0) > 0 && (
                <span style={{ color: textColor, fontSize: 14 }}>@{profile.youtube_handle} · {Number(profile.youtube_subscribers).toLocaleString()}</span>
              )}
              {profile.tiktok_handle && Number(profile.tiktok_followers ?? 0) > 0 && (
                <span style={{ color: textColor, fontSize: 14 }}>@{profile.tiktok_handle} · {Number(profile.tiktok_followers).toLocaleString()}</span>
              )}
              {profile.xiaohongshu_handle && Number(profile.xiaohongshu_followers ?? 0) > 0 && (
                <span style={{ color: textColor, fontSize: 14 }}>
                  @{profile.xiaohongshu_handle} · {Number(profile.xiaohongshu_followers).toLocaleString()}
                </span>
              )}
            </div>
          </section>
        )}

        {isEnabled(profile.mediakit_about_enabled) && !profile.mediakit_lock_about && (profile.mediakit_bio || profile.bio) && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
              {profile.mediakit_about_title ?? "ABOUT ME"}
            </p>
            <p style={{ color: textColor, fontSize: 16, lineHeight: 1.7, maxWidth: 720 }}>{profile.mediakit_bio ?? profile.bio}</p>
          </section>
        )}

        {isEnabled(profile.mediakit_rates_enabled) && !profile.mediakit_lock_rates && activeRateCards.length > 0 && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>RATES CARD</p>
            {activeRateCards.map((rate) => (
              <div
                key={rate.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div>
                  <p style={{ color: textColor, fontSize: 16, fontWeight: 600, margin: 0 }}>{rate.service_name_zh ?? rate.service_name}</p>
                  {rate.platform && <p style={{ color: "rgba(0,0,0,0.45)", fontSize: 13, margin: "2px 0 0" }}>{rate.platform}</p>}
                </div>
                <p style={{ color: textColor, fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {money(rate.price)}
                  {rate.is_starting_price ? "+" : ""}
                </p>
              </div>
            ))}
          </section>
        )}

        {isEnabled(profile.mediakit_brand_partners_enabled) && !profile.mediakit_lock_brand_partners && activeBrandPartners.length > 0 && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>BRAND PARTNERS</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {activeBrandPartners.map((bp) => (
                <div key={bp.id} style={{ background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 500, color: textColor }}>
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
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>PAST PROJECTS</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {activeCaseStudies.map((cs) => (
                <div key={cs.id} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                  {cs.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cs.image_url} style={{ width: "100%", height: 180, objectFit: "cover" }} alt={cs.title ?? "Case study"} />
                  )}
                  <div style={{ padding: 16 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: textColor, margin: "0 0 4px" }}>{cs.title}</p>
                    {cs.brand_name && <p style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", margin: "0 0 8px" }}>{cs.brand_name}</p>}
                    {cs.description && <p style={{ fontSize: 13, color: textColor, lineHeight: 1.5, margin: "0 0 8px" }}>{cs.description}</p>}
                    {cs.result && <p style={{ fontSize: 13, fontWeight: 600, color: accentColor, margin: 0 }}>結果：{cs.result}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {isEnabled(profile.mediakit_links_enabled) && activeBlocks.length > 0 && (
          <section style={{ background: bgColor, padding: "32px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            {profile.mediakit_links_title && (
              <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                {profile.mediakit_links_title}
              </p>
            )}
            {profile.mediakit_links_subtitle && <p style={{ color: textColor, fontSize: 14, marginBottom: 16 }}>{profile.mediakit_links_subtitle}</p>}
            <div
              style={{
                display: profile.mediakit_links_layout === "carousel" ? "grid" : "flex",
                gridTemplateColumns: "repeat(3, 1fr)",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {activeBlocks.map((block) => (
                <a
                  key={block.id}
                  href={block.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    background: accentColor,
                    color: accentText,
                    borderRadius: 50,
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  {block.title}
                </a>
              ))}
            </div>
          </section>
        )}

        <footer style={{ background: bgColor, padding: "24px 48px", textAlign: "center", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <p style={{ color: "rgba(0,0,0,0.3)", fontSize: 12 }}>
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
