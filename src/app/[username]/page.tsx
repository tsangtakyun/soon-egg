import type { CSSProperties, ReactNode } from "react";
import { Mail, Music2, Play } from "lucide-react";
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

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-gray-700 shadow-sm backdrop-blur transition hover:bg-white"
    >
      {children}
    </a>
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
      <div className="relative h-[300px] w-full overflow-hidden">
        {typedProfile.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={typedProfile.cover_url} alt="" className="h-full w-full object-cover" />
        ) : typedTheme?.background_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={typedTheme.background_image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={heroFallbackStyle} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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
            {bio && <p className="text-xs text-white/80">{bio}</p>}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3 px-4 py-4">
        <div className="flex justify-center gap-4 py-3">
          {typedProfile.contact_email && (
            <SocialLink href={`mailto:${typedProfile.contact_email}`} label="Email">
              <Mail className="h-5 w-5" aria-hidden />
            </SocialLink>
          )}
          {typedProfile.tiktok_handle && (
            <SocialLink href={`https://tiktok.com/@${typedProfile.tiktok_handle}`} label="TikTok">
              <Music2 className="h-5 w-5" aria-hidden />
            </SocialLink>
          )}
          {typedProfile.instagram_handle && (
            <SocialLink href={`https://instagram.com/${typedProfile.instagram_handle}`} label="Instagram">
              <span className="text-xs font-bold">IG</span>
            </SocialLink>
          )}
          {typedProfile.xiaohongshu_handle && (
            <SocialLink href={`https://xiaohongshu.com/user/profile/${typedProfile.xiaohongshu_handle}`} label="小紅書">
              <span className="text-[10px] font-bold">小紅書</span>
            </SocialLink>
          )}
          {typedProfile.youtube_handle && (
            <SocialLink href={`https://youtube.com/@${typedProfile.youtube_handle}`} label="YouTube">
              <Play className="h-5 w-5" aria-hidden />
            </SocialLink>
          )}
        </div>

        <FollowButton creatorId={typedProfile.id} displayName={displayName} initialCount={followerCount} buttonColor={btnColor} />

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
          className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition hover:bg-white/30"
          style={{ borderColor: btnColor, color: btnColor }}
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
