import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const TOPIC_MEDIA_BUCKET = "egg-topic-media";
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function uploadTopicImage(admin: SupabaseClient, workspaceId: string, file: File) {
  if (!ACCEPTED.has(file.type)) throw new Error("只支援 JPG、PNG、WebP 或 HEIC 圖片");
  if (file.size <= 0 || file.size > 15 * 1024 * 1024) throw new Error("每張圖片必須細過 15MB");
  const extension = extensionFor(file.type);
  const path = `${workspaceId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const { error } = await admin.storage.from(TOPIC_MEDIA_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return admin.storage.from(TOPIC_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeTopicMedia(admin: SupabaseClient, urls: Array<string | null | undefined>) {
  const marker = `/storage/v1/object/public/${TOPIC_MEDIA_BUCKET}/`;
  const paths = urls.flatMap((value) => {
    if (!value) return [];
    const index = value.indexOf(marker);
    return index === -1 ? [] : [decodeURIComponent(value.slice(index + marker.length))];
  });
  if (paths.length) await admin.storage.from(TOPIC_MEDIA_BUCKET).remove([...new Set(paths)]);
}

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  return "jpg";
}
