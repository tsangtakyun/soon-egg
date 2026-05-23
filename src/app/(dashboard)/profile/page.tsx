import { LinkInBio } from "@/components/profile/LinkInBio";
import type { ProfileBlock } from "@/components/profile/PhonePreview";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  ai_profile_summary: string | null;
};

type Theme = {
  background_gradient: string | null;
  background_color: string | null;
  text_color: string | null;
};

const fallbackProfile: Profile = {
  id: "fallback",
  username: "soon_egg",
  display_name: "SOON-EGG",
  bio: "完成設定後，您的創作者介紹會顯示在這裡。",
  avatar_url: "/soon-egg.png",
  ai_profile_summary: null,
};

export default async function ProfilePage() {
  const supabase = await createClient();
  let profile = fallbackProfile;
  let theme: Theme | null = null;
  let blocks: ProfileBlock[] = [];
  let blocksError = "";

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: creatorProfile } = await supabase
        .from("egg_creator_profiles")
        .select("id, username, display_name, bio, avatar_url, ai_profile_summary")
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorProfile) {
        profile = creatorProfile as Profile;

        const { data: activeTheme } = await supabase
          .from("egg_profile_themes")
          .select("background_gradient, background_color, text_color")
          .eq("creator_id", creatorProfile.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        const { data: profileBlocks, error: profileBlocksError } = await supabase
          .from("egg_profile_blocks")
          .select("*")
          .eq("creator_id", creatorProfile.id)
          .order("sort_order", { ascending: true });

        theme = activeTheme as Theme | null;
        blocks = (profileBlocks ?? []) as ProfileBlock[];
        blocksError = profileBlocksError?.message ?? "";
      }
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">我的主頁</h1>
        <p className="mt-2 text-zinc-500">編輯你的 Link in Bio，公開網址為 sooncreator.network/{profile.username}。</p>
      </div>
      <LinkInBio profile={profile} theme={theme} blocks={blocks} blocksError={blocksError} />
    </div>
  );
}
