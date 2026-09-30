import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

export type ExtractedUrlContent = {
  url: string;
  domain: string;
  title: string;
  description: string;
  excerpt: string;
};

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] >= 224);
}

async function assertSafeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new Error("只支援公開 HTTPS 網址");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("不支援內部網址");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("不支援內部網址");
  return url;
}

function decodeEntities(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : " ";
    }
    return named[entity.toLowerCase()] ?? " ";
  });
}

function cleanText(value: string) {
  return decodeEntities(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== key.toLowerCase()) continue;
    return cleanText(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "");
  }
  return "";
}

async function fetchHtml(startUrl: URL) {
  let current = startUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertSafeUrl(current.href);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SOON-Egg/1.0; +https://egg.sooncreator.network)" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("網址重新導向次數過多");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`網站回應 ${response.status}`);
    if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) throw new Error("網址不是可讀取的網頁");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_HTML_BYTES) throw new Error("網頁內容太大");
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    return { html, url: current };
  }
  throw new Error("未能讀取網址");
}

export async function extractUrlContent(value: string): Promise<ExtractedUrlContent> {
  const startUrl = await assertSafeUrl(value);
  const { html, url } = await fetchHtml(startUrl);
  const title = cleanText(metaContent(html, "og:title") || html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").slice(0, 300);
  const description = cleanText(metaContent(html, "og:description") || metaContent(html, "description")).slice(0, 800);
  const article = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ");
  const excerpt = cleanText(article).slice(0, 8_000);
  if (!title && !description && excerpt.length < 80) throw new Error("網頁沒有足夠可讀內容");
  return { url: url.href, domain: url.hostname, title, description, excerpt };
}
