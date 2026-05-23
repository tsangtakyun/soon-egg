import type { CSSProperties, ReactNode } from "react";
import { Mail } from "lucide-react";
import { FollowButton } from "@/components/public/FollowButton";
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

type PublicProfile = {
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

type PublicBlock = {
  id: string;
  title: string | null;
  url: string | null;
};

type PublicTheme = {
  background_image: string | null;
  background_gradient: string | null;
  background_color: string | null;
  button_color: string | null;
  text_color: string | null;
};

function getBackgroundStyle(theme: PublicTheme | null): CSSProperties {
  if (theme?.background_image) {
    return {
      backgroundImage: `url(${theme.background_image})`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    };
  }

  if (theme?.background_gradient) {
    return { background: theme.background_gradient };
  }

  return { backgroundColor: theme?.background_color ?? "#87CEEB" };
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-900"
    >
      {children}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" />
    </svg>
  );
}

function XiaohongshuIcon() {
  return <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">紅</div>;
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

  const typedProfile = profile as PublicProfile;
  const typedTheme = theme as PublicTheme | null;
  const bgStyle = getBackgroundStyle(typedTheme);
  const btnColor = typedTheme?.button_color ?? "#3b82f6";
  const textColor = typedTheme?.text_color ?? "#1a1a1a";
  const displayName = typedProfile.display_name || typedProfile.username;
  const bio = typedProfile.bio ?? typedProfile.ai_profile_summary;
  const heroFallbackStyle: CSSProperties = typedTheme?.background_gradient
    ? { background: typedTheme.background_gradient }
    : { backgroundColor: typedTheme?.background_color ?? "#87CEEB" };
  const followerCount = followsResult.count ?? 0;

  return (
    <main className="min-h-screen" style={bgStyle}>
      <div className="relative h-[320px] w-full overflow-hidden">
        {typedProfile.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={typedProfile.cover_url} alt="" className="h-full w-full object-cover object-top" />
        ) : typedTheme?.background_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={typedTheme.background_image} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="h-full w-full" style={heroFallbackStyle} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-end gap-3">
          {typedProfile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typedProfile.avatar_url} alt={displayName} className="h-14 w-14 rounded-full border-2 border-white object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 text-xl font-bold text-white">
              {displayName?.[0] ?? "?"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{displayName}</h1>
            {bio && <p className="text-xs text-white drop-shadow">{bio}</p>}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3 px-4 py-4">
        <div className="flex justify-center gap-4 py-3">
          {typedProfile.contact_email && (
            <SocialLink href={`mailto:${typedProfile.contact_email}`} label="Email">
              <Mail className="h-6 w-6" aria-hidden />
            </SocialLink>
          )}
          {typedProfile.tiktok_handle && (
            <SocialLink href={`https://tiktok.com/@${typedProfile.tiktok_handle}`} label="TikTok">
              <TikTokIcon />
            </SocialLink>
          )}
          {typedProfile.instagram_handle && (
            <SocialLink href={`https://instagram.com/${typedProfile.instagram_handle}`} label="Instagram">
              <InstagramIcon />
            </SocialLink>
          )}
          {typedProfile.xiaohongshu_handle && (
            <SocialLink href={`https://xiaohongshu.com/user/profile/${typedProfile.xiaohongshu_handle}`} label="小紅書">
              <XiaohongshuIcon />
            </SocialLink>
          )}
          {typedProfile.youtube_handle && (
            <SocialLink href={`https://youtube.com/@${typedProfile.youtube_handle}`} label="YouTube">
              <YouTubeIcon />
            </SocialLink>
          )}
        </div>

        <div className="mx-auto w-full max-w-sm px-4">
          <FollowButton creatorId={typedProfile.id} displayName={displayName} initialCount={followerCount} btnColor={btnColor} />
        </div>

        {typedProfile.youtube_handle && typedProfile.youtube_latest_video_id && (
          <div className="mx-auto w-full max-w-sm">
            <p className="mb-2 text-center text-xs font-medium" style={{ color: textColor }}>
              最新 YouTube 影片
            </p>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                title={`${displayName} 最新 YouTube 影片`}
                className="absolute inset-0 h-full w-full rounded-xl"
                src={`https://www.youtube.com/embed/${typedProfile.youtube_latest_video_id}`}
                allowFullScreen
              />
            </div>
          </div>
        )}

        {(blocks as PublicBlock[] | null)?.map((block) => (
          <a
            key={block.id}
            href={block.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto flex w-full max-w-sm items-center justify-center rounded-xl px-4 py-3 text-center font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: btnColor }}
          >
            {block.title}
          </a>
        ))}

        {typedProfile.buy_me_a_coffee_url && (
          <a
            href={typedProfile.buy_me_a_coffee_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition hover:opacity-90"
            style={{ backgroundColor: btnColor, color: "#fff" }}
          >
            Buy Me A Coffee
          </a>
        )}

        <a
          href={`/media-kit?creator=${typedProfile.username}`}
          className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: btnColor }}
        >
          查看 Media Kit
        </a>

        <div className="py-6 text-center">
          <a href="https://egg.sooncreator.network/signup" className="text-xs text-gray-500 underline transition hover:text-gray-700">
            Create your own SOON-EGG page
          </a>
        </div>
      </div>
    </main>
  );
}
