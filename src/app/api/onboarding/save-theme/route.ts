import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const THEMES: Record<string, {
  background_image: string;
  background_color: string;
  background_gradient: string | null;
  text_color: string;
  button_color: string;
  button_style: string;
  font_family: string;
}> = {
  "藍天白雲": {
    background_image: "/hero-bg.jpg",
    background_color: "#87CEEB",
    background_gradient: null,
    text_color: "#1a1a1a",
    button_color: "#3b82f6",
    button_style: "rounded",
    font_family: "sans-serif",
  },
  "萬天星空": {
    background_image: "/star-bg.jpg",
    background_color: "#0a0a2e",
    background_gradient: null,
    text_color: "#ffffff",
    button_color: "#818cf8",
    button_style: "pill",
    font_family: "sans-serif",
  },
  "搞笑戲劇": {
    background_image: "/secondbg.jpg",
    background_color: "#1a1a1a",
    background_gradient: null,
    text_color: "#ffffff",
    button_color: "#f59e0b",
    button_style: "square",
    font_family: "sans-serif",
  },
  "科技感覺": {
    background_image: "/tech.jpg",
    background_color: "#0f172a",
    background_gradient: null,
    text_color: "#ffffff",
    button_color: "#00ff9f",
    button_style: "square",
    font_family: "monospace",
  },
  "經典複古": {
    background_image: "/classic.jpg",
    background_color: "#f5f0e8",
    background_gradient: null,
    text_color: "#3d2b1f",
    button_color: "#8b6914",
    button_style: "rounded",
    font_family: "serif",
  },
  "創意主題": {
    background_image: "/creative.jpg",
    background_color: "#f0e6ff",
    background_gradient: null,
    text_color: "#2d1b69",
    button_color: "#7c3aed",
    button_style: "pill",
    font_family: "sans-serif",
  },
};

export async function POST(req: NextRequest) {
  const { themeName } = await req.json() as { themeName?: string };
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const selectedTheme = themeName && THEMES[themeName] ? themeName : "藍天白雲";
  const themeConfig = THEMES[selectedTheme];

  await supabase
    .from("egg_profile_themes")
    .update({ is_active: false })
    .eq("creator_id", profile.id);

  await supabase.from("egg_profile_themes").insert({
    creator_id: profile.id,
    theme_name: selectedTheme,
    is_active: true,
    ...themeConfig,
  });

  await supabase
    .from("egg_creator_profiles")
    .update({ onboarding_completed: true })
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
