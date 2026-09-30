import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createEggAdmin } from "@/lib/creator-workspace";
import { isKnowledgePilot } from "@/lib/core-knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: NextRequest) {
  const expected = process.env.SOON_CORE_BUNDLE_KEY;
  const supplied = request.headers.get("x-soon-lineage-key");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = request.nextUrl.searchParams.get("workspace_id") ?? "";
  if (!isKnowledgePilot(workspaceId)) return NextResponse.json({ error: "Pilot workspace not found" }, { status: 404 });

  const admin = createEggAdmin();
  const [runsResult, publicationsResult] = await Promise.all([
    admin.from("egg_knowledge_generation_runs")
      .select("id,project_id,pack_id,stage,bundle_version,bundle_hash,shown_refs,applied_refs,hook_pattern_code,hook_modifiers,status,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("egg_content_publications")
      .select("pack_id,external_media_id,lineage_status,link_method,link_confidence,published_at,linked_at")
      .eq("workspace_id", workspaceId)
      .order("linked_at", { ascending: false })
      .limit(200),
  ]);
  if (runsResult.error || publicationsResult.error) {
    console.error("[knowledge lineage feed] query failed", runsResult.error || publicationsResult.error);
    return NextResponse.json({ error: "Lineage feed unavailable" }, { status: 500 });
  }
  const publicationsByPack = new Map<string, typeof publicationsResult.data>();
  for (const publication of publicationsResult.data ?? []) {
    if (!publication.pack_id) continue;
    publicationsByPack.set(publication.pack_id, [...(publicationsByPack.get(publication.pack_id) ?? []), publication]);
  }
  return NextResponse.json({
    workspaceId,
    runs: (runsResult.data ?? []).map((run) => {
      const publications = run.pack_id ? (publicationsByPack.get(run.pack_id) ?? []) : [];
      return {
        ...run,
        publication_status: publications.some((item) => item.lineage_status === "attributed") ? "attributed" : "unmatched",
        publications,
      };
    }),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
