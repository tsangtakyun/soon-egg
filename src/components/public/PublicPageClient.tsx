"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FollowButton } from "./FollowButton";
import { ProductCard, type PublicProduct } from "./ProductCard";

export type PublicPageProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  ai_profile_summary: string | null;
  instagram_handle?: string | null;
  instagram_followers?: number | null;
  instagram_engagement_rate?: number | null;
  youtube_handle?: string | null;
  youtube_subscribers?: number | null;
  tiktok_handle?: string | null;
  tiktok_followers?: number | null;
  xiaohongshu_handle?: string | null;
  xiaohongshu_followers?: number | null;
  contact_email?: string | null;
  buy_me_a_coffee_url?: string | null;
  youtube_latest_video_id?: string | null;
  brand_deals_count?: number | null;
};

export type PublicPageBlock = {
  id: string;
  block_type?: string | null;
  title: string | null;
  url: string | null;
  is_visible?: boolean | null;
};

export type PublicPageSection = {
  id: string;
  label: string;
  icon: string;
};

export type PublicRateCard = {
  id: string;
  service_name: string | null;
  service_name_zh: string | null;
  platform: string | null;
  price: number | null;
  currency?: string | null;
};

type CartItem = {
  productId: string;
  qty: number;
};

type PublicPageClientProps = {
  sections: PublicPageSection[];
  profile: PublicPageProfile;
  blocks: PublicPageBlock[];
  shopBlock: PublicPageBlock | null;
  products: PublicProduct[];
  rateCards: PublicRateCard[];
  followerCount: number;
  bgStyle: CSSProperties;
  btnColor: string;
  btnRadius: string;
  textColor: string;
};

const CONTENT_WIDTH = 480;

function getSectionStyle(overrides: CSSProperties = {}): CSSProperties {
  return {
    height: "100vh",
    scrollSnapAlign: "start",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    position: "relative",
    ...overrides,
  };
}

function solidButtonStyle(btnColor: string, btnRadius: string, extra: CSSProperties = {}): CSSProperties {
  return {
    backgroundColor: btnColor,
    color: "white",
    border: "none",
    borderRadius: btnRadius,
    ...extra,
  };
}

function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function BagIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function DocumentIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function MessageIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

function SocialIcon({ href, icon }: { href: string; icon: "instagram" | "youtube" | "tiktok" | "xhs" | "email" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        background: "rgba(255,255,255,0.16)",
        border: "0.5px solid rgba(255,255,255,0.24)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
      }}
      aria-label={icon}
    >
      {icon === "instagram" && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
        </svg>
      )}
      {icon === "youtube" && (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805ZM9.609 15.601V8.408l6.264 3.602Z" />
        </svg>
      )}
      {icon === "tiktok" && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08Z" />
        </svg>
      )}
      {icon === "xhs" && <span style={{ fontSize: 11, fontWeight: 700 }}>紅</span>}
      {icon === "email" && <span style={{ fontSize: 14, fontWeight: 700 }}>@</span>}
    </a>
  );
}

function NavIcon({ id }: { id: string }) {
  const props = { size: 16 };

  if (id === "contact") return <MessageIcon {...props} />;
  if (id === "shop") return <BagIcon {...props} />;
  if (id === "media-kit") return <DocumentIcon {...props} />;
  return <LinkIcon {...props} />;
}

function IconBox({ children, size = 34 }: { children: ReactNode; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(9, Math.round(size * 0.24)),
        background: "rgba(255,255,255,0.16)",
        color: "rgba(255,255,255,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 16 }}>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "white", fontSize: 22, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function formatMoney(value: number, currency = "HKD") {
  const symbol = currency === "HKD" ? "HK$" : "$";
  return `${symbol}${value.toLocaleString()}`;
}

export function PublicPageClient({
  sections,
  profile,
  products,
  rateCards,
  followerCount,
  bgStyle,
  btnColor,
  btnRadius,
}: PublicPageClientProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const displayName = profile.display_name || profile.username;
  const bio = profile.bio ?? profile.ai_profile_summary;
  const contactEmail = profile.contact_email || "hello@sooncreator.network";

  const renderedSections = useMemo(() => sections.filter((section) => section.id !== "hub"), [sections]);

  const sectionIndex = useMemo(
    () => Object.fromEntries(sections.map((section, index) => [section.id, index])),
    [sections],
  );

  const cartTotal = cartItems.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + Number(product?.price ?? 0) * item.qty;
  }, 0);

  const totalReach =
    Number(profile.instagram_followers ?? 0) +
    Number(profile.youtube_subscribers ?? 0) +
    Number(profile.tiktok_followers ?? 0) +
    Number(profile.xiaohongshu_followers ?? 0);

  const goTo = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const target = container.children[index] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAddToCart = (productId: string) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        return current.map((item) => (item.productId === productId ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...current, { productId, qty: 1 }];
    });
  };

  const handleSubmitOrder = async () => {
    const name = (document.getElementById("buyer-name") as HTMLInputElement | null)?.value;
    const email = (document.getElementById("buyer-email") as HTMLInputElement | null)?.value;

    if (!name || !email) {
      alert("請填寫名稱和電郵");
      return;
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          price: Number(products.find((product) => product.id === item.productId)?.price ?? 0),
        })),
        buyer_name: name,
        buyer_email: email,
      }),
    });

    if (response.ok) {
      setShowCheckout(false);
      setCartItems([]);
      alert("訂單已收到！我們會盡快聯絡你。");
    } else {
      alert("訂單未能送出，請稍後再試。");
    }
  };

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          const nextIndex = Number(visible.target.id.replace("section-", ""));
          if (!Number.isNaN(nextIndex)) setActiveSection(nextIndex);
        }
      },
      { root, threshold: [0.55, 0.75] },
    );

    Array.from(root.children).forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <main style={{ ...bgStyle, minHeight: "100vh" }}>
      <div style={{ minHeight: "100vh", backgroundColor: "rgba(0,0,0,0.35)" }}>
        <div
          ref={scrollContainerRef}
          id="scroll-container"
          style={{
            height: "100vh",
            overflowY: "scroll",
            scrollSnapType: "y mandatory",
            scrollBehavior: "smooth",
            scrollbarWidth: "none",
          }}
        >
          <section id="section-0" style={getSectionStyle()}>
            <div
              style={{
                width: "100%",
                maxWidth: CONTENT_WIDTH,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid rgba(255,255,255,0.8)",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.8)",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    color: "white",
                  }}
                >
                  {displayName?.[0] ?? "?"}
                </div>
              )}

              <h1
                style={{
                  color: "white",
                  fontSize: 22,
                  fontWeight: 600,
                  textAlign: "center",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                {displayName}
              </h1>
              {bio && (
                <p
                  style={{
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 13,
                    textAlign: "center",
                    maxWidth: 280,
                    lineHeight: 1.5,
                    overflowWrap: "break-word",
                    wordBreak: "normal",
                    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  }}
                >
                  {bio}
                </p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {profile.contact_email && <SocialIcon href={`mailto:${profile.contact_email}`} icon="email" />}
                {profile.instagram_handle && <SocialIcon href={`https://instagram.com/${profile.instagram_handle}`} icon="instagram" />}
                {profile.youtube_handle && <SocialIcon href={`https://youtube.com/@${profile.youtube_handle}`} icon="youtube" />}
                {profile.tiktok_handle && <SocialIcon href={`https://tiktok.com/@${profile.tiktok_handle}`} icon="tiktok" />}
                {profile.xiaohongshu_handle && (
                  <SocialIcon href={`https://xiaohongshu.com/user/profile/${profile.xiaohongshu_handle}`} icon="xhs" />
                )}
              </div>

              <FollowButton
                creatorId={profile.id}
                displayName={displayName}
                initialCount={followerCount}
                btnColor={btnColor}
                btnRadius={btnRadius}
              />

              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
                {renderedSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => goTo(sectionIndex[section.id])}
                    style={solidButtonStyle(btnColor, btnRadius, {
                      width: "100%",
                      padding: "12px 15px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      textAlign: "left",
                    })}
                  >
                    <IconBox>
                      <NavIcon id={section.id} />
                    </IconBox>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{section.label}</span>
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 15 }}>›</span>
                  </button>
                ))}

                <a
                  href="https://egg.sooncreator.network/signup"
                  style={solidButtonStyle(btnColor, btnRadius, {
                    display: "block",
                    width: "100%",
                    padding: 12,
                    textAlign: "center",
                    fontWeight: 500,
                    fontSize: 14,
                    textDecoration: "none",
                    marginTop: 8,
                  })}
                >
                  Create your own EGG page
                </a>
              </div>
            </div>
          </section>

          {sectionIndex.contact !== undefined && (
            <section id={`section-${sectionIndex.contact}`} style={getSectionStyle()}>
              <div style={{ maxWidth: CONTENT_WIDTH, width: "100%", textAlign: "center" }}>
                <IconBox size={72}>
                  <MessageIcon size={28} />
                </IconBox>
                <h2 style={{ color: "white", fontSize: 24, fontWeight: 500, margin: "20px 0 8px" }}>品牌合作查詢</h2>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                  有興趣與 {displayName} 合作？歡迎發送合作邀請！
                </p>
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(`品牌合作邀請 - ${displayName}`)}`}
                  style={solidButtonStyle(btnColor, btnRadius, {
                    display: "block",
                    width: "100%",
                    padding: 14,
                    textAlign: "center",
                    fontWeight: 500,
                    fontSize: 15,
                    textDecoration: "none",
                  })}
                >
                  發送合作邀請
                </a>
                {profile.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", marginTop: 12, color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}
                  >
                    或 DM @{profile.instagram_handle}
                  </a>
                )}
              </div>
            </section>
          )}

          {sectionIndex.shop !== undefined && products.length > 0 && (
            <section
              id={`section-${sectionIndex.shop}`}
              style={getSectionStyle({ justifyContent: "flex-start", overflowY: "auto", paddingTop: 44, paddingBottom: 24 })}
            >
              <div style={{ width: "100%", maxWidth: CONTENT_WIDTH, margin: "0 auto" }}>
                <h2 style={{ color: "white", fontSize: 22, fontWeight: 500, marginBottom: 4 }}>我的貨品專區</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>瀏覽 {displayName} 精選產品</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      btnColor={btnColor}
                      btnRadius={btnRadius}
                      currency={product.currency || "HKD"}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>

                {cartItems.length > 0 && (
                  <div
                    style={{
                      position: "sticky",
                      bottom: 16,
                      maxWidth: CONTENT_WIDTH,
                      width: "100%",
                      margin: "16px auto 0",
                      background: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "0.5px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    <span style={{ color: "white", fontSize: 14 }}>{cartItems.length} 件商品</span>
                    <button
                      onClick={() => setShowCheckout(true)}
                      style={solidButtonStyle(btnColor, btnRadius, {
                        padding: "10px 24px",
                        fontWeight: 500,
                        fontSize: 14,
                        cursor: "pointer",
                      })}
                      type="button"
                    >
                      結帳 {formatMoney(cartTotal)}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {sectionIndex["media-kit"] !== undefined && (
            <section
              id={`section-${sectionIndex["media-kit"]}`}
              style={getSectionStyle({ justifyContent: "flex-start", overflowY: "auto", paddingTop: 48 })}
            >
              <div style={{ maxWidth: CONTENT_WIDTH, width: "100%" }}>
                <h2 style={{ color: "white", fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Media Kit</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24 }}>{displayName}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                  <StatCard label="TOTAL REACH" value={totalReach.toLocaleString()} />
                  <StatCard label="IG FOLLOWERS" value={Number(profile.instagram_followers ?? 0).toLocaleString()} />
                  <StatCard
                    label="ENGAGEMENT"
                    value={profile.instagram_engagement_rate ? `${profile.instagram_engagement_rate}%` : "—"}
                  />
                  <StatCard label="BRAND DEALS" value={String(profile.brand_deals_count ?? 0)} />
                </div>

                {rateCards.length > 0 && (
                  <>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        marginBottom: 12,
                      }}
                    >
                      Rates Card
                    </div>
                    {rateCards.map((rate) => (
                      <div
                        key={rate.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 0",
                          borderBottom: "0.5px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div>
                          <div style={{ color: "white", fontSize: 14, fontWeight: 500 }}>
                            {rate.service_name_zh ?? rate.service_name}
                          </div>
                          {rate.platform && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{rate.platform}</div>}
                        </div>
                        <div style={{ color: "white", fontSize: 15, fontWeight: 500 }}>
                          {formatMoney(Number(rate.price ?? 0), rate.currency || "HKD")}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(`品牌合作邀請 - ${displayName}`)}`}
                  style={solidButtonStyle(btnColor, btnRadius, {
                    display: "block",
                    width: "100%",
                    padding: 14,
                    textAlign: "center",
                    fontWeight: 500,
                    fontSize: 15,
                    textDecoration: "none",
                    marginTop: 28,
                  })}
                >
                  Work with me
                </a>
              </div>
            </section>
          )}
        </div>

        <div
          style={{
            position: "fixed",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 50,
          }}
        >
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              aria-label={`前往 ${section.label}`}
              onClick={() => goTo(index)}
              style={{
                width: activeSection === index ? 9 : 7,
                height: activeSection === index ? 9 : 7,
                borderRadius: "50%",
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: activeSection === index ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>

        {showCheckout && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: 24,
            }}
          >
            <div style={{ background: "#1a1a2e", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420 }}>
              <h3 style={{ color: "white", fontSize: 18, fontWeight: 500, marginBottom: 20 }}>確認訂單</h3>

              {cartItems.map((item) => {
                const product = products.find((candidate) => candidate.id === item.productId);
                return product ? (
                  <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                      {product.title_zh ?? product.title} x {item.qty}
                    </span>
                    <span style={{ color: "white", fontSize: 14 }}>{formatMoney(Number(product.price ?? 0) * item.qty)}</span>
                  </div>
                ) : null;
              })}

              <div
                style={{
                  borderTop: "0.5px solid rgba(255,255,255,0.15)",
                  margin: "12px 0",
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "white", fontWeight: 500 }}>總計</span>
                <span style={{ color: "white", fontWeight: 500 }}>{formatMoney(cartTotal)}</span>
              </div>

              <input
                placeholder="你的名稱"
                id="buyer-name"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "0.5px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontSize: 14,
                  marginBottom: 10,
                  boxSizing: "border-box",
                }}
              />
              <input
                placeholder="電郵地址"
                id="buyer-email"
                type="email"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "0.5px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontSize: 14,
                  marginBottom: 20,
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={handleSubmitOrder}
                style={solidButtonStyle(btnColor, btnRadius, {
                  width: "100%",
                  padding: 13,
                  fontWeight: 500,
                  fontSize: 15,
                  cursor: "pointer",
                  marginBottom: 10,
                })}
                type="button"
              >
                確認訂單
              </button>
              <button
                onClick={() => setShowCheckout(false)}
                style={{ width: "100%", padding: 10, background: "transparent", color: "rgba(255,255,255,0.5)", border: "none", fontSize: 14, cursor: "pointer" }}
                type="button"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
