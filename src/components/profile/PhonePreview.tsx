import { Camera } from "lucide-react";

export type PhonePreviewProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  ai_profile_summary: string | null;
  buy_me_a_coffee_url?: string | null;
  youtube_latest_video_id?: string | null;
};

export type PhonePreviewTheme = {
  background_image: string | null;
  background_gradient: string | null;
  background_color: string | null;
  text_color: string | null;
  button_color: string | null;
};

export type ProfileBlock = {
  id: string;
  creator_id: string;
  block_type: string;
  title: string | null;
  url: string | null;
  is_visible: boolean | null;
  sort_order: number | null;
  click_count: number | null;
};

export function PhonePreview({
  profile,
  theme,
  blocks,
  onAvatarClick,
  avatarUploading = false,
}: {
  profile: PhonePreviewProfile;
  theme: PhonePreviewTheme | null;
  blocks: ProfileBlock[];
  onAvatarClick?: () => void;
  avatarUploading?: boolean;
}) {
  const displayName = profile.display_name || profile.username;
  const bio = profile.bio || profile.ai_profile_summary || "";
  const firstInitial = displayName?.trim()[0]?.toUpperCase() || "?";
  const previewStyle = profile.cover_url
    ? {
        backgroundImage: `url(${profile.cover_url})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        color: theme?.text_color ?? "#1a1a1a",
      }
    : theme?.background_image
    ? {
        backgroundImage: `url(${theme.background_image})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        color: theme.text_color ?? "#1a1a1a",
      }
    : {
        background: theme?.background_gradient ?? theme?.background_color ?? "#87CEEB",
        color: theme?.text_color ?? "#1a1a1a",
      };
  const buttonColor = theme?.button_color ?? "#3b82f6";

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[32px] border-8 border-zinc-950 bg-zinc-950 p-2 shadow-2xl">
      <div className="min-h-[620px] overflow-hidden rounded-[24px] p-5 text-center" style={previewStyle}>
        <button
          type="button"
          onClick={onAvatarClick}
          disabled={!onAvatarClick || avatarUploading}
          className="group relative mx-auto mt-6 block h-16 w-16 rounded-full disabled:cursor-wait"
          aria-label="更換頭像"
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={displayName} className="h-16 w-16 rounded-full bg-white object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/30 text-xl font-bold text-white backdrop-blur-sm">
              {firstInitial}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" aria-hidden />
          </span>
        </button>
        <h2 className="mt-4 text-xl font-bold">{displayName}</h2>
        <p className="mt-2 text-sm opacity-75">{bio}</p>
        <div className="mt-6 space-y-3">
          {blocks.map((block) => (
            <div
              key={block.id}
              className={`rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white backdrop-blur ${
                block.is_visible === false ? "opacity-50" : ""
              }`}
              style={{ backgroundColor: buttonColor }}
            >
              {block.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
