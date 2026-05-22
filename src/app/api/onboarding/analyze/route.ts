import { analyzeCreator } from "@/lib/ai/analyze-creator";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const analysis = await analyzeCreator(body);
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
