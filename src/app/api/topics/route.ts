import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canEditWorkspace, getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { listTopicIdeas } from "@/lib/topic-library";
import { persistRemoteTopicCover, removeTopicMedia, uploadTopicImage } from "@/lib/topic-media";

export async function DELETE(request: Request) {
  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (activeWorkspace.role !== "owner") return NextResponse.json({ error: "只有擁有者可以刪除題材" }, { status: 403 });
  const ideaId = new URL(request.url).searchParams.get("ideaId") ?? "";
  const { data: idea } = await admin.from("egg_topic_ideas").select("id,image_url,media_urls").eq("id", ideaId).eq("workspace_id", activeWorkspace.id).maybeSingle();
  if (!idea) return NextResponse.json({ error: "找不到可刪除題材" }, { status: 404 });
  const { error } = await admin.from("egg_topic_ideas").delete().eq("id", idea.id).eq("workspace_id", activeWorkspace.id);
  if (error) return NextResponse.json({ error: "未能刪除題材" }, { status: 500 });
  await removeTopicMedia(admin, [idea.image_url, ...(idea.media_urls ?? [])]);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (activeWorkspace.role !== "owner") return NextResponse.json({ error: "只有擁有者可以更換封面" }, { status: 403 });
  const form = await request.formData();
  const ideaId = String(form.get("ideaId") ?? "");
  const cover = form.get("cover");
  if (!(cover instanceof File)) return NextResponse.json({ error: "請選擇封面圖片" }, { status: 400 });
  const { data: idea } = await admin.from("egg_topic_ideas").select("id,image_url,media_urls").eq("id", ideaId).eq("workspace_id", activeWorkspace.id).maybeSingle();
  if (!idea) return NextResponse.json({ error: "找不到可修改題材" }, { status: 404 });
  try {
    const imageUrl = await uploadTopicImage(admin, activeWorkspace.id, cover);
    const mediaUrls = [imageUrl];
    const { error } = await admin.from("egg_topic_ideas").update({ image_url: imageUrl, media_urls: mediaUrls, updated_at: new Date().toISOString() }).eq("id", idea.id);
    if (error) throw error;
    if (idea.image_url && idea.image_url !== imageUrl) await removeTopicMedia(admin, [idea.image_url]);
    return NextResponse.json({ success: true, imageUrl, mediaUrls });
  } catch (error) {
    console.error("Topic cover update failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "未能更換封面" }, { status: 500 });
  }
}

export async function GET() {
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  try {
    return NextResponse.json({ ideas: await listTopicIdeas(activeWorkspace.id), role: activeWorkspace.role });
  } catch (error) {
    console.error("Topic library load failed", error);
    return NextResponse.json({ error: "未能載入題材靈感" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await createClient();
  const { data: { user } } = auth ? await auth.auth.getUser() : { data: { user: null } };
  const { activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.mode === "repair-cover") {
    const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
    const { data: idea } = await admin.from("egg_topic_ideas").select("id,title,platform,source_url,image_url,media_urls").eq("id", ideaId).eq("workspace_id", activeWorkspace.id).maybeSingle();
    if (!idea) return NextResponse.json({ error: "找不到可修復題材" }, { status: 404 });
    let candidate = idea.image_url ?? "";
    if (idea.source_url) {
      try {
        const response = await fetch(idea.source_url, { headers: { "user-agent": "Mozilla/5.0 SOON Topic Cover Repair" }, signal: AbortSignal.timeout(8_000) });
        const html = (await response.text()).slice(0, 300_000);
        candidate = metaValue(html, "og:image") || candidate;
      } catch (error) { console.warn("Topic cover source refresh unavailable", error instanceof Error ? error.message : error); }
    }
    const imageUrl = await persistRemoteTopicCover(admin, activeWorkspace.id, candidate, { title: idea.title, platform: idea.platform });
    const mediaUrls = [imageUrl, ...(idea.media_urls ?? []).filter((url: string) => url !== idea.image_url && url !== imageUrl)];
    const { error } = await admin.from("egg_topic_ideas").update({ image_url: imageUrl, media_urls: mediaUrls, updated_at: new Date().toISOString() }).eq("id", idea.id);
    if (error) return NextResponse.json({ error: "未能修復封面" }, { status: 500 });
    return NextResponse.json({ success: true, imageUrl, mediaUrls });
  }
  if (body.mode === "import") {
    if (!canEditWorkspace(activeWorkspace.role)) return NextResponse.json({ error: "只有擁有者或管理員可以匯入題材" }, { status: 403 });
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, 4000) : "";
    let parsedUrl: URL;
    try { parsedUrl = new URL(sourceUrl); } catch { return NextResponse.json({ error: "請輸入有效網址" }, { status: 400 }); }
    const allowedHosts = ["instagram.com", "www.instagram.com", "youtube.com", "www.youtube.com", "youtu.be", "tiktok.com", "www.tiktok.com", "xiaohongshu.com", "www.xiaohongshu.com", "adaymag.com", "www.adaymag.com"];
    if (parsedUrl.protocol !== "https:" || !allowedHosts.includes(parsedUrl.hostname.toLowerCase())) return NextResponse.json({ error: "暫時支援 Instagram、YouTube、TikTok、小紅書及 A Day Magazine 連結" }, { status: 400 });

    let pageTitle = "";
    let pageDescription = "";
    try {
      const response = await fetch(parsedUrl.toString(), { headers: { "user-agent": "Mozilla/5.0 SOON Topic Importer" }, signal: AbortSignal.timeout(8000) });
      const html = (await response.text()).slice(0, 300000);
      pageTitle = decodeHtml(html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? html.match(/<title[^>]*>([^<]+)/i)?.[1] ?? "");
      pageDescription = decodeHtml(html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)/i)?.[1] ?? "");
    } catch (error) { console.warn("Topic source metadata unavailable", parsedUrl.hostname, error instanceof Error ? error.message : error); }
    if (!pageTitle && !pageDescription && !context) return NextResponse.json({ error: "平台未提供可讀內容，請喺「補充資料」貼上 caption 或重點" }, { status: 422 });

    const fallback = { title: pageTitle || "待整理題材", summary: context || pageDescription, category: "其他", tags: [] as string[], content_format: "short_video" };
    let enriched = fallback;
    const anthropic = getAnthropic();
    if (anthropic) {
      const message = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6", max_tokens: 700, messages: [{ role: "user", content: `只根據以下已提供資料整理社交內容題材，禁止補作未提供事實。輸出 JSON：{"title":"繁體中文標題","summary":"80至140字可拍角度","category":"分類","tags":["最多4個"],"content_format":"carousel或short_video或single_image"}\n來源：${parsedUrl.hostname}\n網頁標題：${pageTitle}\n網頁描述：${pageDescription}\n用家補充：${context}` }] });
      const text = message.content.find((item) => item.type === "text")?.text ?? "";
      enriched = parseJsonFromText(text, fallback);
    }
    if (!enriched.title?.trim() || !enriched.summary?.trim()) return NextResponse.json({ error: "資料不足，請補充原文 caption 或內容重點" }, { status: 422 });
    const { data: idea, error } = await admin.from("egg_topic_ideas").insert({ workspace_id: activeWorkspace.id, title: enriched.title.trim(), summary: enriched.summary.trim(), source_name: parsedUrl.hostname.replace(/^www\./, ""), source_url: parsedUrl.toString(), platform: platformName(parsedUrl.hostname), category: enriched.category || "其他", tags: Array.isArray(enriched.tags) ? enriched.tags.slice(0, 4) : [], content_format: ["carousel", "short_video", "single_image"].includes(enriched.content_format) ? enriched.content_format : "short_video", status: "published", created_by: user.id }).select("id,title,summary,source_name,source_url,image_url,platform,category,tags,content_format,workspace_id,created_at").single();
    if (error) { console.error("Topic import save failed", error.message); return NextResponse.json({ error: "未能儲存題材" }, { status: 500 }); }
    return NextResponse.json({ success: true, idea: { ...idea, saved: false, want_to_create: false } });
  }
  const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!ideaId || !["save", "create", "dismiss"].includes(action)) return NextResponse.json({ error: "操作無效" }, { status: 400 });
  const patch = {
    workspace_id: activeWorkspace.id,
    idea_id: ideaId,
    saved: action === "save" || action === "create",
    want_to_create: action === "create",
    dismissed: action === "dismiss",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("egg_topic_actions").upsert(patch, { onConflict: "workspace_id,idea_id" });
  if (error) {
    console.error("Topic action failed", error.message);
    return NextResponse.json({ error: "未能儲存操作" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim();
}

function metaValue(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)`, "i"))?.[1] ?? "";
}

function platformName(hostname: string) {
  if (hostname.includes("instagram")) return "Instagram";
  if (hostname.includes("youtube") || hostname === "youtu.be") return "YouTube";
  if (hostname.includes("tiktok")) return "TikTok";
  if (hostname.includes("xiaohongshu")) return "小紅書";
  return "網頁";
}
