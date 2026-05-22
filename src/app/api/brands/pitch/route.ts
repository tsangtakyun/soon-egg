import { generatePitch } from "@/lib/ai/generate-pitch";
import { demoCreator } from "@/lib/mock-data";
import { ASIAN_BRANDS } from "@/lib/seed-brands";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pitch = await generatePitch({
      creator: body.creator ?? demoCreator,
      brand: body.brand ?? ASIAN_BRANDS[0],
      language: body.language ?? "zh-HK",
    });

    return NextResponse.json({ pitch });
  } catch {
    return NextResponse.json({ error: "Pitch generation failed" }, { status: 500 });
  }
}
