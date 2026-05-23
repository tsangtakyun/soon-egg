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
  ai_profile_summary: string | null;
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

  const [{ data: blocks }, { data: theme }] = await Promise.all([
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
  ]);

  await supabase.from("egg_analytics_events").insert({
    creator_id: profile.id,
    event_type: "profile_view",
    source: "direct",
  });

  const typedProfile = profile as PublicProfile;
  const typedTheme = theme as PublicTheme | null;
  const bgStyle = typedTheme?.background_image
    ? {
        backgroundImage: `url(${typedTheme.background_image})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : typedTheme?.background_gradient
      ? { background: typedTheme.background_gradient }
      : { backgroundColor: typedTheme?.background_color ?? "#87CEEB" };
  const btnColor = typedTheme?.button_color ?? "#3b82f6";
  const textColor = typedTheme?.text_color ?? "#1a1a1a";
  const displayName = typedProfile.display_name || typedProfile.username;
  const bio = typedProfile.bio ?? typedProfile.ai_profile_summary;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 pt-16" style={bgStyle}>
      <div className="mb-4">
        {typedProfile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={typedProfile.avatar_url}
            alt={displayName}
            className="h-20 w-20 rounded-full border-2 border-white/50 object-cover"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/30 text-2xl font-bold"
            style={{ color: textColor }}
          >
            {displayName?.[0] ?? "?"}
          </div>
        )}
      </div>

      <h1 className="mb-1 text-center text-xl font-bold" style={{ color: textColor }}>
        {displayName}
      </h1>
      {bio && (
        <p className="mb-8 max-w-xs text-center text-sm opacity-80" style={{ color: textColor }}>
          {bio}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        {(blocks as PublicBlock[] | null)?.map((block) => (
          <a
            key={block.id}
            href={block.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-xl px-4 py-3 text-center font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: btnColor }}
          >
            {block.title}
          </a>
        ))}
      </div>
    </main>
  );
}
