import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { demoBlocks, demoCreator, demoThemes } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { ProfileBlock, ProfileTheme } from "@/lib/types";

type PublicCreator = typeof demoCreator & {
  egg_profile_blocks?: ProfileBlock[];
  egg_profile_themes?: ProfileTheme[];
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
  const blocks = (creator.egg_profile_blocks ?? demoBlocks).filter((block) => block.is_visible).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main
      className="min-h-screen"
      style={{
        background: activeTheme.background_gradient || activeTheme.background_color || "#000",
        color: activeTheme.text_color || "#fff",
        fontFamily: activeTheme.font_family || "sans-serif",
      }}
    >
      <div className="flex flex-col items-center px-6 pb-6 pt-12">
        <Image src={creator.avatar_url ?? ""} alt={creator.display_name} width={96} height={96} unoptimized className="mb-4 h-24 w-24 rounded-full bg-white object-cover" />
        <h1 className="text-xl font-bold">{creator.display_name}</h1>
        <p className="mt-1 max-w-sm text-center text-sm opacity-75">{creator.bio}</p>
        <div className="mt-4 flex gap-3 text-sm">
          {creator.instagram_handle && <a href={`https://instagram.com/${creator.instagram_handle}`} target="_blank" rel="noopener noreferrer">IG</a>}
          {creator.youtube_handle && <a href={`https://youtube.com/@${creator.youtube_handle}`} target="_blank" rel="noopener noreferrer">YT</a>}
          {creator.xiaohongshu_handle && <span>小紅書</span>}
          {creator.tiktok_handle && <span>TikTok</span>}
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3 px-6 pb-12">
        {blocks.map((block) => (
          <LinkBlock key={block.id} block={block} theme={activeTheme} />
        ))}
      </div>

      <div className="pb-6 text-center text-xs opacity-50">
        Powered by <Link href="/">SOON-EGG Creator Network</Link>
      </div>
    </main>
  );
}

function LinkBlock({ block, theme }: { block: ProfileBlock; theme: ProfileTheme }) {
  const content = (
    <div
      className="rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold shadow-sm backdrop-blur transition hover:scale-[1.01]"
      style={{ background: theme.button_color || "rgba(255,255,255,0.16)" }}
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
