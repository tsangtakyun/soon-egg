import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "egg-topic-media";
const MARKER = /\n\n\[附件圖片\]\((https:\/\/[^)]+)\)\s*$/;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function saveReplyAttachment(admin: SupabaseClient, workspaceId: string, image?: { data?: string; mediaType?: string } | null) {
  if (!image?.data || !image.mediaType || !TYPES[image.mediaType]) return null;
  const bytes = Buffer.from(image.data, "base64");
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new Error("截圖太大，請裁剪後再試");
  const path = `${workspaceId}/reply-attachments/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${TYPES[image.mediaType]}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: image.mediaType, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function withReplyAttachment(content: string, attachmentUrl?: string | null) {
  return attachmentUrl ? `${content}\n\n[附件圖片](${attachmentUrl})` : content;
}

export function presentReplyMessage<T extends { content: string }>(message: T) {
  const match = message.content.match(MARKER);
  return { ...message, content: message.content.replace(MARKER, ""), attachment_url: match?.[1] ?? null };
}
