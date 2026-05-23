import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.CW_BASE_URL;
  const apiKey = process.env.SOON_INTERNAL_API_KEY;

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "Campaign feed is not configured" }, { status: 500 });
  }

  const res = await fetch(`${baseUrl}/api/public/campaigns`, {
    headers: { "x-soon-api-key": apiKey },
    next: { revalidate: 300 },
  });
  const data = await res.json();

  return NextResponse.json(data, { status: res.status });
}
