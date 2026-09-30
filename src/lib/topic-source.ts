/** Identity only: preserve the original URL for fetching; never merge by title or image. */
export function topicSourceKey(value: string): string {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "instagram.com") {
      const id = url.pathname.match(/^\/(?:p|reel|reels|tv)\/([^/]+)/)?.[1];
      if (id) return `instagram:${id}`;
    }
    if (["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.split("/")[1] : url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
      if (id) return `youtube:${id}`;
    }
    url.hash = "";
    return url.href;
  } catch { return value.trim(); }
}
export function isPendingTopic(topic: { title?: unknown; tags?: unknown }) {
  return topic.title === "正在整理題材" || (Array.isArray(topic.tags) && topic.tags.includes("AI整理中"));
}
export function hasChineseEditorialText(value: unknown): value is string {
  return typeof value === "string" && /[\u3400-\u9fff]/.test(value) && !/正在整理題材|正在背景讀取/.test(value);
}
