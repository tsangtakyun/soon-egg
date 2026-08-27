import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.CW_BASE_URL;
  const apiKey = process.env.SOON_INTERNAL_API_KEY;

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "Campaign feed is not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(`${baseUrl}/api/public/campaigns`, {
    headers: { "x-soon-api-key": apiKey, Accept: "application/json" },
    cache: "no-store",
  }).catch((error) => {
    console.error("Campaign feed upstream request failed:", error);
    return null;
  });
  if (!res)
    return NextResponse.json(
      { error: "暫時未能連接品牌合作平台。" },
      { status: 502 },
    );

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    console.error(
      "Campaign feed upstream returned a non-JSON response:",
      res.status,
      contentType,
    );
    return NextResponse.json(
      { error: "品牌合作平台回應格式不正確，請稍後再試。" },
      { status: 502 },
    );
  }
  const data = await res.json().catch(() => null);
  if (!data)
    return NextResponse.json(
      { error: "品牌合作平台回應無法讀取。" },
      { status: 502 },
    );
  return NextResponse.json(data, { status: res.status });
}
