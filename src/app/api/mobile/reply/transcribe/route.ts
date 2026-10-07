import { NextResponse } from "next/server";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { getEggRequestContext } from "@/lib/egg-api-context";

export const maxDuration = 300;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
  "audio/ogg",
  "audio/opus",
  "application/ogg",
]);

function subtitleHeaders(userId: string) {
  const secret = process.env.SOON_SUBTITLE_INTEGRATION_SECRET;
  if (!secret) throw new Error("語音轉寫服務尚未完成設定");
  return { "x-soon-integration-secret": secret, "x-soon-user-id": userId };
}

async function subtitleJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(280_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.error || "語音轉寫失敗");
  return payload;
}

export async function POST(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const previewBlock = trialPreviewAdmissionResponse();
  if (previewBlock) return previewBlock;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "未有收到語音檔案" }, { status: 400 });
    const supportedExtension = /\.(mp3|m4a|mp4|wav|ogg|opus)$/i.test(file.name);
    if (!ALLOWED_AUDIO_TYPES.has(file.type) && !supportedExtension) {
      return NextResponse.json({ error: "請選擇 MP3、M4A、WAV、OGG 或 WhatsApp OPUS 語音" }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "語音檔案不可超過 25MB" }, { status: 413 });

    const baseUrl = process.env.SOON_SUBTITLE_SERVICE_URL || "https://soon-subtitle.vercel.app";
    const headers = subtitleHeaders(context.user.id);
    const upload = new FormData();
    upload.set("file", file, file.name || `voice-${Date.now()}.opus`);
    upload.set("title", `回覆中心語音 · ${file.name || "錄音"}`);
    upload.set("originalFilename", file.name || "voice.opus");
    upload.set("originalSizeBytes", String(file.size));
    upload.set("compressedSizeBytes", String(file.size));

    const created = await subtitleJson(new URL("/api/sessions", baseUrl).toString(), { method: "POST", headers, body: upload });
    const sessionId = String(created.session?.id || "");
    if (!sessionId) throw new Error("語音 session 建立失敗");
    await subtitleJson(new URL("/api/transcribe", baseUrl).toString(), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const completed = await subtitleJson(new URL(`/api/sessions/${sessionId}`, baseUrl).toString(), { method: "GET", headers });
    const transcript = (Array.isArray(completed.lines) ? completed.lines : [])
      .map((line: { raw_text?: unknown }) => typeof line.raw_text === "string" ? line.raw_text.trim() : "")
      .filter(Boolean)
      .join("\n");
    if (!transcript) throw new Error("未能從錄音辨識到文字，請重試或改用文字輸入");
    return NextResponse.json({ success: true, transcript, sessionId, filename: file.name });
  } catch (error) {
    console.error("Reply voice transcription failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "語音轉寫失敗" }, { status: 500 });
  }
}
