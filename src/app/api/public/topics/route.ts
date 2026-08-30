import { NextResponse } from "next/server";

import { createEggAdmin } from "@/lib/creator-workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createEggAdmin();
  const { data, error } = await admin
    .from("egg_topic_ideas")
    .select("id,title,summary,source_name,source_url,image_url,media_urls,platform,category,tags,content_format,created_at")
    .eq("status", "published")
    .not("workspace_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Unable to load public Egg topics", error);
    return NextResponse.json({ error: "暫時未能載入題材" }, { status: 500 });
  }

  const topics = (data ?? []).map((topic) => ({
    id: topic.id,
    title: topic.title,
    summary: topic.summary,
    content_formats: [topic.content_format || "short_video"],
    keywords: Array.isArray(topic.tags) ? topic.tags : [],
    cover_url: topic.image_url,
    media_urls: Array.isArray(topic.media_urls) ? topic.media_urls : [],
    published_at: topic.created_at,
    topic_item_directions: [{ is_primary: true, topic_directions: { label_zh: topic.category || "最新精選" } }],
    topic_sources: topic.source_url ? [{ url: topic.source_url, source_name: topic.source_name || topic.platform || "SOON 用戶分享" }] : [],
  }));

  return NextResponse.json(
    { topics },
    { headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    } },
  );
}
