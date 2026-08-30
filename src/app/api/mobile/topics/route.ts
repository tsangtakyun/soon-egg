import { NextResponse } from "next/server";
import { createEggAdmin } from "@/lib/creator-workspace";
import { getTopicMembership, listTopicIdeas } from "@/lib/topic-library";

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function context(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const admin = createEggAdmin();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const membership = await getTopicMembership(user.id, request.headers.get("x-egg-workspace-id"));
  return { ...membership, user };
}

export async function GET(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  try {
    return NextResponse.json({ ideas: await listTopicIdeas(auth.workspaceId), role: auth.role });
  } catch (error) {
    console.error("Mobile topic library load failed", error);
    return NextResponse.json({ error: "未能載入題材靈感" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.mode === "import") {
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const contextText = typeof body.context === "string" ? body.context.trim().slice(0, 4000) : "";
    const requestedCategory = typeof body.category === "string" ? body.category.trim().slice(0, 80) : "";
    const requestedImage = typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 1500) : "";
    let parsedUrl: URL;
    try { parsedUrl = new URL(sourceUrl); } catch { return NextResponse.json({ error: "分享內容未包含有效連結" }, { status: 400 }); }
    const hostname = parsedUrl.hostname.toLowerCase();
    const allowedHosts = ["instagram.com", "www.instagram.com", "youtube.com", "www.youtube.com", "youtu.be", "tiktok.com", "www.tiktok.com", "xiaohongshu.com", "www.xiaohongshu.com", "threads.net", "www.threads.net"];
    if (parsedUrl.protocol !== "https:" || !allowedHosts.includes(hostname)) return NextResponse.json({ error: "暫時支援 Instagram、Threads、YouTube、TikTok 及小紅書連結" }, { status: 400 });

    const { data: existing } = await auth.admin.from("egg_topic_ideas")
      .select("id").eq("workspace_id", auth.workspaceId).eq("source_url", parsedUrl.toString()).limit(1).maybeSingle();
    if (existing?.id) return NextResponse.json({ success: true, ideaId: existing.id, existing: true });

    let pageTitle = "";
    let pageDescription = "";
    let pageImage = "";
    try {
      const response = await fetch(parsedUrl.toString(), { headers: { "user-agent": "Mozilla/5.0 SOON Egg Share" }, signal: AbortSignal.timeout(8_000) });
      const html = (await response.text()).slice(0, 300_000);
      pageTitle = decodeHtml(metaValue(html, "og:title") || html.match(/<title[^>]*>([^<]+)/i)?.[1] || "");
      pageDescription = decodeHtml(metaValue(html, "og:description") || metaValue(html, "description") || "");
      pageImage = metaValue(html, "og:image");
    } catch (error) { console.warn("Mobile shared topic metadata unavailable", hostname, error instanceof Error ? error.message : error); }

    const platform = platformName(hostname);
    const title = (pageTitle || `${platform} 分享題材`).slice(0, 220);
    const summary = (contextText || pageDescription || "已由分享功能儲存，可稍後整理成拍攝方向。").slice(0, 2000);
    const { data: idea, error } = await auth.admin.from("egg_topic_ideas").insert({
      workspace_id: auth.workspaceId,
      title,
      summary,
      source_name: hostname.replace(/^www\./, ""),
      source_url: parsedUrl.toString(),
      image_url: requestedImage.startsWith("https://") ? requestedImage : (pageImage.startsWith("https://") ? pageImage : null),
      platform,
      category: requestedCategory || "私人收藏",
      tags: [platform.toLowerCase(), "分享收藏"],
      content_format: "short_video",
      status: "published",
      created_by: auth.user.id,
    }).select("id").single();
    if (error) { console.error("Mobile shared topic save failed", error.message); return NextResponse.json({ error: "未能儲存分享題材" }, { status: 500 }); }
    return NextResponse.json({ success: true, ideaId: idea.id, existing: false });
  }
  const action = typeof body.action === "string" ? body.action : "";
  const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
  if (!ideaId || !["save", "create", "dismiss"].includes(action)) return NextResponse.json({ error: "操作無效" }, { status: 400 });
  const { error } = await auth.admin.from("egg_topic_actions").upsert({
    workspace_id: auth.workspaceId,
    idea_id: ideaId,
    saved: action === "save" || action === "create",
    want_to_create: action === "create",
    dismissed: action === "dismiss",
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,idea_id" });
  if (error) return NextResponse.json({ error: "未能儲存操作" }, { status: 500 });
  return NextResponse.json({ success: true });
}

function metaValue(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)`, "i"))?.[1] ?? "";
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

function platformName(hostname: string) {
  if (hostname.includes("instagram")) return "Instagram";
  if (hostname.includes("threads")) return "Threads";
  if (hostname.includes("youtube") || hostname === "youtu.be") return "YouTube";
  if (hostname.includes("tiktok")) return "TikTok";
  if (hostname.includes("xiaohongshu")) return "小紅書";
  return "網頁";
}
