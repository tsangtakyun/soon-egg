export type PhonePreviewProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  ai_profile_summary: string | null;
};

export type PhonePreviewTheme = {
  background_gradient: string | null;
  background_color: string | null;
  text_color: string | null;
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

const fallbackGradient = "linear-gradient(135deg, #1a1a2e, #e94560)";

export function PhonePreview({
  profile,
  theme,
  blocks,
}: {
  profile: PhonePreviewProfile;
  theme: PhonePreviewTheme | null;
  blocks: ProfileBlock[];
}) {
  const displayName = profile.display_name || profile.username;
  const bio = profile.bio || profile.ai_profile_summary || "";
  const themeBackground = theme?.background_gradient ?? theme?.background_color ?? fallbackGradient;
  const textColor = theme?.text_color ?? "#ffffff";

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[32px] border-8 border-zinc-950 bg-zinc-950 p-2 shadow-2xl">
      <div className="min-h-[620px] overflow-hidden rounded-[24px] p-5 text-center" style={{ background: themeBackground, color: textColor }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.avatar_url || "/soon-egg.png"} alt={displayName} className="mx-auto mt-6 h-16 w-16 rounded-full bg-white object-cover" />
        <h2 className="mt-4 text-xl font-bold">{displayName}</h2>
        <p className="mt-2 text-sm opacity-75">{bio}</p>
        <div className="mt-6 space-y-3">
          {blocks.map((block) => (
            <div
              key={block.id}
              className={`rounded-lg border border-white/20 bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur ${
                block.is_visible === false ? "opacity-50" : ""
              }`}
            >
              {block.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
