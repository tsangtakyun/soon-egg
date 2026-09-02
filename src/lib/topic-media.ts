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
  const bytes = Buffer.from(await file.arrayBuffer());
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await admin.storage.from(TOPIC_MEDIA_BUCKET).upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      // Retrying the same unique path must be idempotent. A transient 5xx can
      // arrive after Storage has already accepted the first upload.
      upsert: true,
    });
    if (!error) return admin.storage.from(TOPIC_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

    lastError = error;
    if (!isTransientStorageError(error) || attempt === 3) break;
    console.warn("Topic image upload transient failure; retrying", {
      attempt,
      status: storageStatus(error),
      size: file.size,
      type: file.type,
    });
    await new Promise((resolve) => setTimeout(resolve, attempt * 400));
  }

  console.error("Topic image upload exhausted retries", {
    status: storageStatus(lastError),
    size: file.size,
    type: file.type,
  });
  throw new Error("圖片儲存服務暫時未能回應，請再試一次");
}

export async function persistRemoteTopicCover(
  admin: SupabaseClient,
  workspaceId: string,
  remoteUrl: string,
  fallback: { title: string; platform: string },
) {
  if (isAllowedRemoteCover(remoteUrl)) {
    try {
      const response = await fetch(remoteUrl, {
        headers: { accept: "image/avif,image/webp,image/png,image/jpeg,*/*", "user-agent": "Mozilla/5.0 SOON Topic Cover" },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      const mime = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      const length = Number(response.headers.get("content-length") ?? 0);
      if (!response.ok || !ACCEPTED.has(mime) || length > 15 * 1024 * 1024) throw new Error(`Remote cover ${response.status} ${mime}`);
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 15 * 1024 * 1024) throw new Error("Remote cover size invalid");
      return uploadTopicImage(admin, workspaceId, new File([bytes], `cover.${extensionFor(mime)}`, { type: mime }));
    } catch (error) {
      console.warn("Remote topic cover could not be persisted; using generated cover", error instanceof Error ? error.message : error);
    }
  }

  const svg = generatedCoverSvg(fallback.title, fallback.platform);
  return uploadTopicBytes(admin, workspaceId, Buffer.from(svg), "image/svg+xml", "svg");
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

async function uploadTopicBytes(admin: SupabaseClient, workspaceId: string, bytes: Buffer, contentType: string, extension: string) {
  const path = `${workspaceId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const { error } = await admin.storage.from(TOPIC_MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error("圖片儲存服務暫時未能回應，請再試一次");
  return admin.storage.from(TOPIC_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

function generatedCoverSvg(title: string, platform: string) {
  const cleanTitle = title.trim().slice(0, 34) || "收藏題材";
  const firstLine = escapeSvg(cleanTitle.slice(0, 17));
  const secondLine = escapeSvg(cleanTitle.slice(17));
  const safePlatform = escapeSvg(platform.trim().slice(0, 20) || "SOON EGG");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff3cf"/><stop offset="1" stop-color="#f2c7b5"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><circle cx="540" cy="470" r="170" fill="#fff" opacity=".72"/><circle cx="540" cy="470" r="92" fill="#ffc43d"/><circle cx="505" cy="445" r="10"/><circle cx="575" cy="445" r="10"/><path d="M495 505q45 55 90 0" fill="none" stroke="#17120f" stroke-width="14" stroke-linecap="round"/><text x="540" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#7b2d20">${safePlatform}</text><text x="540" y="875" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="700" fill="#17120f"><tspan x="540">${firstLine}</tspan>${secondLine ? `<tspan x="540" dy="82">${secondLine}</tspan>` : ""}</text></svg>`;
}

function escapeSvg(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

function isAllowedRemoteCover(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return ["instagram.com", "cdninstagram.com", "fbcdn.net", "ytimg.com", "youtube.com", "tiktokcdn.com", "tiktokcdn-us.com", "xhscdn.com", "xiaohongshu.com", "threads.net"].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function storageStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const value = error as { status?: number | string; statusCode?: number | string };
  return Number(value.statusCode ?? value.status) || null;
}

function isTransientStorageError(error: unknown) {
  const status = storageStatus(error);
  if (status && status >= 500) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(?:fetch|network|timeout|temporar|<none>)/i.test(message);
}
