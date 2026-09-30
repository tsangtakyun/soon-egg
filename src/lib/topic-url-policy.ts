// Shared by queue acceptance, background import and website import.
const socialHosts = new Set([
  "instagram.com", "www.instagram.com", "youtube.com", "www.youtube.com", "youtu.be",
  "tiktok.com", "www.tiktok.com", "xiaohongshu.com", "www.xiaohongshu.com",
  "vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com",
  "xhslink.cn", "www.xhslink.cn", "xhslink.com", "www.xhslink.com",
  "threads.net", "www.threads.net", "threads.com", "www.threads.com",
]);
export function isSupportedTopicUrl(url: URL, allowEditorial = false): boolean {
  return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443")
    && (socialHosts.has(url.hostname.toLowerCase()) || (allowEditorial && ["adaymag.com", "www.adaymag.com"].includes(url.hostname.toLowerCase())));
}

export function isTopicAccessPage(url: URL, title = ""): boolean {
  return /\/(?:login|signin|sign-in|passport|captcha|challenge|verify)(?:\/|$)/i.test(url.pathname)
    || /(?:登录|登入|登錄|安全验证|安全驗證|验证码|驗證碼|log\s*in|sign\s*in|verify you are human)/i.test(title);
}

export async function readTikTokMetadata(url: URL): Promise<{ title: string; image: string }> {
  if (!isSupportedTopicUrl(url) || !["tiktok.com", "www.tiktok.com", "m.tiktok.com"].includes(url.hostname)) return { title: "", image: "" };
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`, { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!response.ok) return { title: "", image: "" };
    const data = await response.json();
    return { title: typeof data.title === "string" ? data.title.slice(0, 4000) : "", image: typeof data.thumbnail_url === "string" ? data.thumbnail_url : "" };
  } catch { return { title: "", image: "" }; }
}

/** Resolve only approved destinations; never follow a short link to arbitrary hosts. */
export async function fetchTopicPage(url: URL, allowEditorial = false, fetcher: typeof fetch = fetch): Promise<Response> {
  let current = new URL(url);
  const signal = AbortSignal.timeout(8000);
  for (let hops = 0; hops < 6; hops++) {
    // Some XHS links advertise HTTP destinations. Upgrade before any request.
    if (current.protocol === "http:") current.protocol = "https:";
    if (!isSupportedTopicUrl(current, allowEditorial)) throw new Error("分享連結轉至不支援的網址");
    if (isTopicAccessPage(current)) throw new Error("平台要求登入或驗證，請補充原帖文字或截圖");
    const response = await fetcher(current, { redirect: "manual", signal, headers: { "user-agent": "Mozilla/5.0 SOON Egg Share" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("分享連結缺少轉址");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error("平台暫時未提供可讀內容，請補充原帖文字或截圖");
    return response;
  }
  throw new Error("分享連結轉址次數過多");
}
