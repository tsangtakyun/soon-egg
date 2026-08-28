import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";

type HistoryMessage = { role: "user" | "assistant"; content: string };
const tones = new Set(["friendly", "professional", "concise", "firm"]);
const languages = new Set(["zh-HK", "zh-TW", "en"]);
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const modeLabels: Record<string, string> = { brand: "回覆品牌合作邀請", negotiation: "報價及議價", follow_up: "合作跟進", decline: "婉拒合作", fan: "回覆粉絲留言或私訊" };
const toneLabels: Record<string, string> = { friendly: "親切", professional: "專業", concise: "簡潔", firm: "堅定" };
const languageLabels: Record<string, string> = { "zh-HK": "香港繁體中文", "zh-TW": "台灣繁體中文", en: "英文" };

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  const { data: { user } } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { message?: string; history?: HistoryMessage[]; projectId?: string; tone?: string; language?: string; projectNotes?: string; image?: { data?: string; mediaType?: string } };
  const cleanMessage = body.message?.trim();
  if (!cleanMessage) return NextResponse.json({ error: "請貼上對方訊息或輸入想回覆嘅內容。" }, { status: 400 });
  if (cleanMessage.length > 8000) return NextResponse.json({ error: "訊息太長，請縮短至 8,000 字內。" }, { status: 400 });

  const mode = "brand";
  const tone = tones.has(body.tone ?? "") ? body.tone! : "friendly";
  const language = languages.has(body.language ?? "") ? body.language! : "zh-HK";
  const projectNotes = typeof body.projectNotes === "string" ? body.projectNotes.trim().slice(0, 2000) : "";
  const { profile } = await getActiveCreatorProfile("id,display_name,username,bio,content_categories,instagram_handle,content_language");
  if (!profile) return NextResponse.json({ error: "找不到目前工作空間。" }, { status: 404 });

  const admin = createEggAdmin();
  const { data: project } = body.projectId ? await admin.from("egg_reply_projects").select("id,name,notes,tone,language").eq("id", body.projectId).eq("creator_id", profile.id).maybeSingle() : { data: null };
  if (!project) return NextResponse.json({ error: "找不到目前 Project。" }, { status: 404 });
  const now = Date.now();
  const [minuteUsage, dayUsage] = await Promise.all([
    admin.from("egg_reply_usage").select("id", { count: "exact", head: true }).eq("creator_id", profile.id).gte("created_at", new Date(now - 60_000).toISOString()),
    admin.from("egg_reply_usage").select("id", { count: "exact", head: true }).eq("creator_id", profile.id).gte("created_at", new Date(now - 86_400_000).toISOString()),
  ]);
  if (minuteUsage.error || dayUsage.error) {
    console.error("[reply centre] rate-limit lookup failed", minuteUsage.error?.message ?? dayUsage.error?.message);
    return NextResponse.json({ error: "AI 服務暫時未能確認使用限額，請稍後再試。" }, { status: 503 });
  }
  const minuteCount = minuteUsage.count;
  const dayCount = dayUsage.count;
  if ((minuteCount ?? 0) >= 10 || (dayCount ?? 0) >= 100) {
    return NextResponse.json({ error: "使用次數太頻密，請稍後再試。" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const { error: usageInsertError } = await admin.from("egg_reply_usage").insert({ creator_id: profile.id });
  if (usageInsertError) {
    console.error("[reply centre] usage record failed", usageInsertError.message);
    return NextResponse.json({ error: "AI 服務暫時未能記錄使用次數，請稍後再試。" }, { status: 503 });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-10).filter((item) => item?.role === "user" || item?.role === "assistant").map((item) => ({ role: item.role, content: String(item.content).slice(0, 8000) })) : [];
  const allowedMedia = new Set(["image/jpeg", "image/png", "image/webp"]);
  const imageData = body.image?.data && body.image.data.length <= 4_000_000 && allowedMedia.has(body.image.mediaType ?? "") ? body.image : null;
  const categories = Array.isArray(profile.content_categories) ? profile.content_categories.join("、") : "未設定";
  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "AI 服務暫時未設定。" }, { status: 503 });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: `你係 SOON-EGG 回覆助手，專門協助亞洲創作者處理品牌合作及社交訊息。

目前創作者資料：
- 名稱：${profile.display_name || profile.username || "未設定"}
- 公開用戶名：${profile.username || "未設定"}
- 簡介：${profile.bio || "未設定"}
- 內容類型：${categories}
- Instagram：${profile.instagram_handle || "未連接"}

今次任務：${modeLabels[mode]}
語氣：${toneLabels[tone]}
輸出語言：${languageLabels[language]}
Project／聯絡人：${project.name}
Project 背景：${projectNotes || project.notes || "未設定；只根據今次訊息作答"}

規則：
- 只根據用戶提供及創作者資料撰寫，不可虛構報價、日期、合作承諾或成績。
- 資料不足時用 [請填寫] 標示，唔好自行猜測。
- 直接輸出可發送嘅回覆，唔好先解釋寫作思路。
- 避免過度奉承、官腔及不自然 emoji。`,
      messages: [...history, { role: "user" as const, content: imageData ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: imageData.mediaType as "image/jpeg" | "image/png" | "image/webp", data: imageData.data! } },
        { type: "text" as const, text: cleanMessage },
      ] : cleanMessage }],
    });
    const reply = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    if (!reply) throw new Error("Empty AI response");

    let warning: string | undefined;
    const { error } = await admin.from("egg_reply_messages").insert([
      { creator_id: profile.id, project_id: project.id, role: "user", content: imageData ? `${cleanMessage}\n\n[已附上截圖]` : cleanMessage },
      { creator_id: profile.id, project_id: project.id, role: "assistant", content: reply },
    ]);
    if (error) { console.error("[reply centre] history persistence failed", error.message); warning = "回覆已生成，但暫時未能儲存對話。"; }
    return NextResponse.json({ reply, warning });
  } catch (error) {
    console.error("[reply centre] generation failed", error);
    return NextResponse.json({ error: "AI 暫時未能生成回覆，請稍後再試。" }, { status: 502 });
  }
}
