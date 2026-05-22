import { matchBrands } from "@/lib/ai/match-brands";
import { demoCreator } from "@/lib/mock-data";
import { ASIAN_BRANDS } from "@/lib/seed-brands";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { creator_id } = await req.json();
    const supabase = await createClient();

    let creator = demoCreator;
    let brands = ASIAN_BRANDS;

    if (supabase && creator_id) {
      const { data: creatorData } = await supabase.from("creator_profiles").select("*").eq("id", creator_id).single();
      const { data: brandData } = await supabase.from("brands").select("*");
      creator = creatorData ?? creator;
      brands = brandData ?? brands;
    }

    const { matches } = await matchBrands(creator, brands);

    if (supabase && creator_id) {
      for (const match of matches) {
        await supabase.from("brand_deals").upsert({
          creator_id,
          brand_id: match.brand_id,
          status: "prospecting",
          ai_match_score: match.match_score,
          notes: match.reason_zh,
          proposed_rate: match.estimated_rate_hkd,
          currency: "HKD",
        });
      }
    }

    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}
