import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(`${process.env.CW_BASE_URL}/api/public/perks`, {
    headers: process.env.SOON_INTERNAL_API_KEY
      ? { "x-soon-api-key": process.env.SOON_INTERNAL_API_KEY }
      : undefined,
    next: { revalidate: 300 },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json({ error: data?.error || "Failed to fetch perks" }, { status: 502 });
  }

  return NextResponse.json(data);
}
