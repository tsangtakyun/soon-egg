import { analyticsSeries } from "@/lib/mock-data";
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    synced_at: new Date().toISOString(),
    platforms: ["Instagram", "YouTube", "小紅書", "TikTok"],
    series: analyticsSeries,
  });
}
