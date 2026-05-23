"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FollowButton } from "./FollowButton";

export type PublicPageProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  ai_profile_summary: string | null;
  instagram_handle?: string | null;
  youtube_handle?: string | null;
  tiktok_handle?: string | null;
  xiaohongshu_handle?: string | null;
  contact_email?: string | null;
  buy_me_a_coffee_url?: string | null;
  youtube_latest_video_id?: string | null;
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

type PublicPageClientProps = {
  sections: PublicPageSection[];
  profile: PublicPageProfile;
  blocks: PublicPageBlock[];
  shopBlock: PublicPageBlock | null;
  followerCount: number;
  bgStyle: React.CSSProperties;
  btnColor: string;
  btnRadius: string;
  textColor: string;
};

const CONTENT_WIDTH = 480;

function getSectionStyle(overrides: React.CSSProperties = {}): React.CSSProperties {
  return {
    height: "100vh",
    scrollSnapAlign: "start",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    position: "relative",
    ...overrides,
  };
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
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      )}
      {icon === "youtube" && (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
        </svg>
      )}
      {icon === "tiktok" && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" />
        </svg>
      )}
      {icon === "xhs" && <span style={{ fontSize: 11, fontWeight: 700 }}>紅</span>}
      {icon === "email" && <span style={{ fontSize: 14, fontWeight: 700 }}>@</span>}
    </a>
  );
}

export function PublicPageClient({
  sections,
  profile,
  blocks,
  shopBlock,
  followerCount,
  bgStyle,
  btnColor,
  btnRadius,
  textColor,
}: PublicPageClientProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);
  const displayName = profile.display_name || profile.username;
  const bio = profile.bio ?? profile.ai_profile_summary;

  const sectionIndex = useMemo(
    () => Object.fromEntries(sections.map((section, index) => [section.id, index])),
    [sections],
  );

  const goTo = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const target = container.children[index] as HTMLElement | undefined;
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
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

    Array.from(root.children).forEach((section) => {
      if (section) observer.observe(section);
    });

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
          <section id={`section-${sectionIndex.hub}`} style={getSectionStyle()}>
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
                {sections
                  .filter((section) => section.id !== "hub")
                  .map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => goTo(sectionIndex[section.id])}
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.12)",
                        border: "0.5px solid rgba(255,255,255,0.25)",
                        borderRadius: 14,
                        padding: "12px 15px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                        color: textColor,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          background: "rgba(255,255,255,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 16,
                        }}
                      >
                        {section.icon}
                      </div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{section.label}</span>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 15 }}>›</span>
                    </button>
                  ))}
              </div>
            </div>
          </section>

          {sectionIndex.video !== undefined && profile.youtube_latest_video_id && (
            <section id={`section-${sectionIndex.video}`} style={getSectionStyle()}>
              <div style={{ width: "100%", maxWidth: CONTENT_WIDTH, margin: "0 auto" }}>
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  最新影片
                </p>
                <div style={{ width: "100%", borderRadius: 14, overflow: "hidden", aspectRatio: "16/9" }}>
                  <iframe
                    title={`${displayName} 最新 YouTube 影片`}
                    src={`https://www.youtube.com/embed/${profile.youtube_latest_video_id}`}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    allowFullScreen
                  />
                </div>
              </div>
            </section>
          )}

          {sectionIndex.links !== undefined && (
            <section id={`section-${sectionIndex.links}`} style={getSectionStyle({ justifyContent: "center" })}>
              <div style={{ width: "100%", maxWidth: CONTENT_WIDTH, margin: "0 auto" }}>
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  我的連結
                </p>
                {blocks.map((block) => (
                  <a
                    key={block.id}
                    href={block.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.08)",
                      border: "0.5px solid rgba(255,255,255,0.15)",
                      borderRadius: 13,
                      padding: "13px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      marginBottom: 9,
                      color: "white",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: "rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 16,
                      }}
                    >
                      🔗
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ color: "white", fontSize: 13, fontWeight: 500, display: "block" }}>{block.title}</strong>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontSize: 11,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {block.url}
                      </span>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {sectionIndex.shop !== undefined && shopBlock && (
            <section id={`section-${sectionIndex.shop}`} style={getSectionStyle()}>
              <div
                style={{
                  width: "100%",
                  maxWidth: CONTENT_WIDTH,
                  margin: "0 auto",
                  background: "rgba(255,255,255,0.07)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 18,
                  padding: "28px 20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 14 }}>🛍️</div>
                <h2 style={{ color: textColor, fontSize: 18, fontWeight: 500, marginBottom: 8 }}>我的貨品專區</h2>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>
                  瀏覽 {displayName} 精選產品
                </p>
                <a
                  href={shopBlock.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: 12,
                    borderRadius: btnRadius,
                    backgroundColor: btnColor,
                    color: "white",
                    textAlign: "center",
                    fontWeight: 500,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  立即瀏覽 →
                </a>
              </div>
            </section>
          )}

          {sectionIndex.coffee !== undefined && profile.buy_me_a_coffee_url && (
            <section id={`section-${sectionIndex.coffee}`} style={getSectionStyle()}>
              <div
                style={{
                  width: "100%",
                  maxWidth: CONTENT_WIDTH,
                  margin: "0 auto",
                  background: "rgba(255,200,80,0.1)",
                  border: "0.5px solid rgba(255,200,80,0.25)",
                  borderRadius: 20,
                  padding: "28px 20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 14 }}>☕</div>
                <h2 style={{ color: "#ffd080", fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Buy Me A Coffee</h2>
                <p style={{ color: "rgba(255,208,128,0.55)", fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>
                  喜歡我的內容？請我飲杯咖啡支持創作！
                </p>
                <a
                  href={profile.buy_me_a_coffee_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: 12,
                    borderRadius: btnRadius,
                    backgroundColor: "#ffd080",
                    color: "#2d1b00",
                    textAlign: "center",
                    fontWeight: 500,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  支持我 ☕
                </a>
              </div>
            </section>
          )}

          <section id={`section-${sectionIndex.cta}`} style={getSectionStyle()}>
            <div style={{ width: "100%", maxWidth: CONTENT_WIDTH, margin: "0 auto" }}>
              <a
                href={`/media-kit?creator=${profile.username}`}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 13,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 28,
                  color: textColor,
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 19,
                  }}
                >
                  📋
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14, fontWeight: 500, display: "block" }}>查看 Media Kit</strong>
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>品牌合作資料</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.25)" }}>↗</span>
              </a>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🥚</div>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 14 }}>
                  想要屬於自己的 SOON-EGG 頁面？
                </p>
                <a
                  href="https://egg.sooncreator.network/signup"
                  style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: textColor,
                    borderRadius: 50,
                    padding: "10px 24px",
                    fontSize: 12,
                    textDecoration: "none",
                  }}
                >
                  Create your own EGG page
                </a>
              </div>
            </div>
          </section>
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
              aria-label={`前往${section.label}`}
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
      </div>
    </main>
  );
}
