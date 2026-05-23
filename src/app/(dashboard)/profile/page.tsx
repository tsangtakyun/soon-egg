import { LinkInBio } from "@/components/profile/LinkInBio";
import type { ProfileBlock } from "@/components/profile/PhonePreview";
import { createClient } from "@/lib/supabase/server";

type Profile = {
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

type Theme = {
  background_image: string | null;
  background_gradient: string | null;
  background_color: string | null;
  text_color: string | null;
  button_color: string | null;
};

const fallbackProfile: Profile = {
  id: "fallback",
  username: "soon_egg",
  display_name: "SOON-EGG",
  bio: "亞洲創作者的品牌合作與變現中樞",
  avatar_url: null,
  cover_url: null,
  ai_profile_summary: null,
  buy_me_a_coffee_url: null,
  youtube_latest_video_id: null,
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
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (creatorProfile) {
        profile = creatorProfile as Profile;

        const { data: activeTheme } = await supabase
          .from("egg_profile_themes")
          .select("background_image, background_gradient, background_color, text_color, button_color")
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

  return <LinkInBio profile={profile} theme={theme} blocks={blocks} blocksError={blocksError} />;
}
