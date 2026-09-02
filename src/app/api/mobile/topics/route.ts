import { NextResponse } from "next/server";
import { createEggAdmin } from "@/lib/creator-workspace";
import { getTopicMembership, listTopicIdeas } from "@/lib/topic-library";
import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { persistRemoteTopicCover, removeTopicMedia, uploadTopicImage } from "@/lib/topic-media";

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

export async function PUT(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "未有收到圖片" }, { status: 400 });
    return NextResponse.json({ success: true, imageUrl: await uploadTopicImage(auth.admin, auth.workspaceId, file) });
  } catch (error) {
    console.error("Mobile topic image upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "未能上載圖片" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (auth.role !== "owner") return NextResponse.json({ error: "只有擁有者可以刪除題材" }, { status: 403 });
  const ideaId = new URL(request.url).searchParams.get("ideaId") ?? "";
  const { data: idea } = await auth.admin.from("egg_topic_ideas").select("id,image_url,media_urls").eq("id", ideaId).eq("workspace_id", auth.workspaceId).maybeSingle();
  if (!idea) return NextResponse.json({ error: "找不到可刪除題材" }, { status: 404 });
  const { error } = await auth.admin.from("egg_topic_ideas").delete().eq("id", idea.id).eq("workspace_id", auth.workspaceId);
  if (error) return NextResponse.json({ error: "未能刪除題材" }, { status: 500 });
  await removeTopicMedia(auth.admin, [idea.image_url, ...(idea.media_urls ?? [])]);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (auth.role !== "owner") return NextResponse.json({ error: "只有擁有者可以更換封面" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.startsWith("https://") ? body.imageUrl : "";
  const { data: idea } = await auth.admin.from("egg_topic_ideas").select("id,media_urls").eq("id", ideaId).eq("workspace_id", auth.workspaceId).maybeSingle();
  const ownedUploadMarker = `/storage/v1/object/public/egg-topic-media/${auth.workspaceId}/`;
  if (!idea || !imageUrl || (!(idea.media_urls ?? []).includes(imageUrl) && !imageUrl.includes(ownedUploadMarker))) return NextResponse.json({ error: "封面圖片無效" }, { status: 400 });
  const mediaUrls = [imageUrl, ...(idea.media_urls ?? []).filter((url: string) => url !== imageUrl)];
  const { error } = await auth.admin.from("egg_topic_ideas").update({ image_url: imageUrl, media_urls: mediaUrls, updated_at: new Date().toISOString() }).eq("id", idea.id);
  if (error) return NextResponse.json({ error: "未能更換封面" }, { status: 500 });
  return NextResponse.json({ success: true, imageUrl });
}

export async function POST(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.mode === "import-media") {
    const mediaUrls: string[] = Array.isArray(body.mediaUrls) ? body.mediaUrls.filter((value: unknown): value is string => typeof value === "string" && value.startsWith("https://")).slice(0, 20) : [];
    if (!mediaUrls.length) return NextResponse.json({ error: "未有收到圖片" }, { status: 400 });
    const contextText = typeof body.context === "string" ? body.context.trim().slice(0, 4000) : "";
    const fallback = {
      title: mediaUrls.length > 1 ? "相簿分享題材" : "圖片分享題材",
      summary: contextText || `已從電話相簿儲存${mediaUrls.length}張圖片，可整理成拍攝靈感。`,
      category: "其他",
      tags: ["圖片靈感", mediaUrls.length > 1 ? "carousel" : "單圖"],
      content_format: mediaUrls.length > 1 ? "carousel" : "single_image",
    };
    let enriched = fallback;
    const anthropic = getAnthropic();
    if (anthropic) {
      try {
        const images = await Promise.all(mediaUrls.slice(0, 6).map(async (url) => {
          const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
          const contentType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
          const allowedType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType) ? contentType : "image/jpeg";
          return { type: "image" as const, source: { type: "base64" as const, media_type: allowedType as "image/jpeg", data: Buffer.from(await response.arrayBuffer()).toString("base64") } };
        }));
        const message = await anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
          max_tokens: 700,
          messages: [{ role: "user", content: [...images, { type: "text" as const, text: `根據圖片可見內容整理一張繁體中文題材卡。多張圖片屬同一個 carousel，禁止拆散，禁止補作圖片沒有的事實。補充文字：${contextText || "沒有"}\n只輸出 JSON：{"title":"標題","summary":"80至140字內容方向","category":"分類","tags":["最多4個"],"content_format":"carousel或single_image"}` }] }],
        });
        const text = message.content.find((item) => item.type === "text")?.text ?? "";
        enriched = parseJsonFromText(text, fallback);
      } catch (error) { console.warn("Shared photo topic AI analysis failed", error instanceof Error ? error.message : error); }
    }
    const { data: idea, error } = await auth.admin.from("egg_topic_ideas").insert({
      workspace_id: auth.workspaceId,
      title: enriched.title?.trim().slice(0, 220) || fallback.title,
      summary: enriched.summary?.trim().slice(0, 2000) || fallback.summary,
      source_name: "電話相簿",
      source_url: null,
      image_url: mediaUrls[0],
      media_urls: mediaUrls,
      platform: "相簿",
      category: enriched.category?.trim().slice(0, 80) || "其他",
      tags: Array.isArray(enriched.tags) ? enriched.tags.slice(0, 4) : fallback.tags,
      content_format: mediaUrls.length > 1 ? "carousel" : "single_image",
      status: "published",
      created_by: auth.user.id,
    }).select("id").single();
    if (error) { console.error("Shared photo topic save failed", error.message); return NextResponse.json({ error: "未能儲存相簿題材" }, { status: 500 }); }
    return NextResponse.json({ success: true, ideaId: idea.id, existing: false });
  }
  if (body.mode === "import") {
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const contextText = typeof body.context === "string" ? body.context.trim().slice(0, 4000) : "";
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
    const fallback = {
      title: (pageTitle || `${platform} 分享題材`).slice(0, 220),
      summary: (contextText || pageDescription || "已由分享功能儲存，可稍後整理成拍攝方向。").slice(0, 2000),
      category: "其他",
      tags: [platform.toLowerCase(), "分享收藏"],
      content_format: "short_video",
    };
    let enriched = fallback;
    const anthropic = getAnthropic();
    if (anthropic && (pageTitle || pageDescription || contextText)) {
      try {
        const message = await anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
          max_tokens: 700,
          messages: [{
            role: "user",
            content: `只根據以下資料整理社交內容題材，禁止補作未提供事實。自動判斷最合適內容分類及地區關鍵字。輸出 JSON：{"title":"繁體中文標題","summary":"80至140字可拍角度","category":"分類","tags":["最多4個，地區可放入tag"],"content_format":"carousel或short_video或single_image"}\n來源：${hostname}\n網頁標題：${pageTitle}\n網頁描述：${pageDescription}\n用家補充：${contextText}`,
          }],
        });
        const text = message.content.find((item) => item.type === "text")?.text ?? "";
        enriched = parseJsonFromText(text, fallback);
      } catch (error) {
        console.warn("Mobile shared topic AI classification failed", error instanceof Error ? error.message : error);
      }
    }
    const coverCandidate = requestedImage.startsWith("https://") ? requestedImage : (pageImage.startsWith("https://") ? pageImage : "");
    const durableCover = await persistRemoteTopicCover(auth.admin, auth.workspaceId, coverCandidate, {
      title: enriched.title || fallback.title,
      platform,
    });
    const { data: idea, error } = await auth.admin.from("egg_topic_ideas").insert({
      workspace_id: auth.workspaceId,
      title: enriched.title.trim().slice(0, 220),
      summary: enriched.summary.trim().slice(0, 2000),
      source_name: hostname.replace(/^www\./, ""),
      source_url: parsedUrl.toString(),
      image_url: durableCover,
      media_urls: [durableCover],
      platform,
      category: enriched.category?.trim().slice(0, 80) || "其他",
      tags: Array.isArray(enriched.tags) ? enriched.tags.slice(0, 4) : fallback.tags,
      content_format: ["carousel", "short_video", "single_image"].includes(enriched.content_format) ? enriched.content_format : "short_video",
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

function platformName(hostname: string) {
  if (hostname.includes("instagram")) return "Instagram";
  if (hostname.includes("threads")) return "Threads";
  if (hostname.includes("youtube") || hostname === "youtu.be") return "YouTube";
  if (hostname.includes("tiktok")) return "TikTok";
  if (hostname.includes("xiaohongshu")) return "小紅書";
  return "網頁";
}
