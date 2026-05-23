import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const THEMES: Record<string, {
  background_color: string;
  background_gradient: string | null;
  text_color: string;
  button_color: string;
  button_style: string;
  font_family: string;
}> = {
  "日系清透": {
    background_color: "#f8f4f0",
    background_gradient: "linear-gradient(135deg, #f8f4f0, #e8e0d8)",
    text_color: "#2d2d2d",
    button_color: "#c9a96e",
    button_style: "rounded",
    font_family: "sans-serif",
  },
  "韓系黃昏": {
    background_color: "#1a1a2e",
    background_gradient: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
    text_color: "#ffffff",
    button_color: "#e94560",
    button_style: "pill",
    font_family: "sans-serif",
  },
  "港風霓虹": {
    background_color: "#0a0a0a",
    background_gradient: "linear-gradient(135deg, #0a0a0a, #1a0a2e)",
    text_color: "#ffffff",
    button_color: "#00ff9f",
    button_style: "square",
    font_family: "monospace",
  },
  "台系文青": {
    background_color: "#f5f0e8",
    background_gradient: "linear-gradient(135deg, #f5f0e8, #e8e0d0)",
    text_color: "#3d3530",
    button_color: "#8b7355",
    button_style: "rounded",
    font_family: "serif",
  },
  "現代極簡": {
    background_color: "#ffffff",
    background_gradient: null,
    text_color: "#000000",
    button_color: "#000000",
    button_style: "square",
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

  const selectedTheme = themeName && THEMES[themeName] ? themeName : "現代極簡";
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
