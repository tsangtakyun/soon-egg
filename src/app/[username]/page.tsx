import Link from "next/link";
import { notFound } from "next/navigation";
import { demoBlocks, demoCreator, demoThemes } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { ProfileBlock, ProfileTheme } from "@/lib/types";

type PublicCreator = typeof demoCreator & {
  egg_profile_blocks?: ProfileBlock[];
  egg_profile_themes?: ProfileTheme[];
};

const buttonRadius: Record<string, string> = {
  rounded: "rounded-xl",
  pill: "rounded-full",
  square: "rounded-none",
};

export default async function CreatorPublicPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  let creator: PublicCreator | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("egg_creator_profiles")
      .select("*, egg_profile_blocks(*), egg_profile_themes(*)")
      .eq("username", username)
      .eq("is_public", true)
      .single();

    creator = data;

    if (creator) {
      await supabase.from("egg_analytics_events").insert({
        creator_id: creator.id,
        event_type: "profile_view",
        source: "direct",
      });
    }
  }

  if (!creator && username === demoCreator.username) {
    creator = { ...demoCreator, egg_profile_blocks: demoBlocks, egg_profile_themes: demoThemes };
  }

  if (!creator) notFound();

  const activeTheme = creator.egg_profile_themes?.find((theme) => theme.is_active) ?? demoThemes[0];
  const bgStyle = activeTheme.background_image
    ? {
        backgroundImage: `url(${activeTheme.background_image})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }
    : {
        background: activeTheme.background_gradient || activeTheme.background_color || "#ffffff",
      };
  const textColor = activeTheme.text_color || "#000000";
  const blocks = (creator.egg_profile_blocks ?? demoBlocks)
    .filter((block) => block.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="min-h-screen" style={bgStyle}>
      <div className="min-h-screen bg-black/10">
        <div className="mx-auto max-w-md px-6 py-12">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-3 h-20 w-20 overflow-hidden rounded-full bg-white/30 backdrop-blur-sm">
              {creator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatar_url} alt={creator.display_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: textColor }}>
                    {creator.display_name?.[0] || "C"}
                  </span>
                </div>
              )}
            </div>

            <h1 className="mb-1 text-xl font-bold" style={{ color: textColor }}>
              {creator.display_name || creator.username}
            </h1>

            {creator.bio && (
              <p className="mb-3 text-center text-sm opacity-80" style={{ color: textColor }}>
                {creator.bio}
              </p>
            )}

            <div className="flex gap-3">
              {creator.instagram_handle && (
                <a href={`https://instagram.com/${creator.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold" style={{ color: textColor }}>
                  IG
                </a>
              )}
              {creator.youtube_handle && (
                <a href={`https://youtube.com/@${creator.youtube_handle}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold" style={{ color: textColor }}>
                  YT
                </a>
              )}
              {creator.tiktok_handle && (
                <a href={`https://tiktok.com/@${creator.tiktok_handle}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold" style={{ color: textColor }}>
                  TK
                </a>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {blocks.map((block) => (
              <LinkBlock key={block.id} block={block} theme={activeTheme} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-xs opacity-40" style={{ color: textColor }}>
              Powered by <Link href="/">SOON-EGG</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function LinkBlock({ block, theme }: { block: ProfileBlock; theme: ProfileTheme }) {
  const radius = buttonRadius[theme.button_style] || "rounded-xl";
  const content = (
    <div
      className={`block w-full px-4 py-3 text-center font-medium transition-opacity hover:opacity-90 ${radius}`}
      style={{
        backgroundColor: theme.button_color || "#000000",
        color: "#ffffff",
      }}
    >
      {block.title}
    </div>
  );

  if (!block.url) {
    return content;
  }

  return (
    <a href={block.url} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
}
