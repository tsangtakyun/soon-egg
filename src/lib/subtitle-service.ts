import { createClient } from "@/lib/supabase/server";

const DEFAULT_SERVICE_URL = "https://soon-subtitle.vercel.app";

const ALLOWED_PATHS = [
  /^sessions(?:\/[0-9a-f-]+)?$/i,
  /^transcribe$/,
  /^refine$/,
  /^lines\/[0-9a-f-]+$/i,
  /^export-srt$/,
  /^fal\/proxy$/,
];

export async function proxySubtitleService(request: Request, path: string) {
  if (!ALLOWED_PATHS.some((pattern) => pattern.test(path))) {
    return Response.json({ success: false, error: "Unsupported subtitle operation" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.SOON_SUBTITLE_INTEGRATION_SECRET;
  if (!secret) {
    console.error("[subtitle-service] SOON_SUBTITLE_INTEGRATION_SECRET is missing");
    return Response.json({ success: false, error: "字幕服務尚未完成設定" }, { status: 503 });
  }

  const baseUrl = process.env.SOON_SUBTITLE_SERVICE_URL || DEFAULT_SERVICE_URL;
  const upstreamPath = path === "fal/proxy" ? "integration/fal/proxy" : path;
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`/api/${upstreamPath}${incomingUrl.search}`, baseUrl);
  const headers = new Headers(request.headers);
  for (const name of ["host", "content-length", "cookie", "authorization", "accept-encoding"]) {
    headers.delete(name);
  }
  headers.set("x-soon-integration-secret", secret);
  headers.set("x-soon-user-id", user.id);

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    duplex: "half",
    cache: "no-store",
  } as RequestInit);

  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
