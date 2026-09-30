import "server-only";
import { createEggAdmin } from "./creator-workspace";
import { extractTopicGeography, researchTopicGeography } from "./topic-geography-extraction";

/** CAS lease: concurrent cron/import callbacks cannot overwrite a later edit. */
export async function retryTopicGeography(id?: string) {
  const admin = createEggAdmin();
  // Recover the final lease if a serverless invocation was terminated mid-attempt.
  const expired = new Date().toISOString();
  const { error: expiryError } = await admin.from("egg_topic_ideas")
    .update({ geography_retry_at: null, geography_error: "review_required:retry_budget_exhausted" })
    .gte("geography_attempts", 4).lte("geography_retry_at", expired);
  if (expiryError) throw expiryError;
  let query = admin.from("egg_topic_ideas")
    .select("id,updated_at,countries,localities,geography_status,geography_kind,geography_source_text,geography_attempts,geography_retry_at")
    .eq("status", "published").eq("import_state", "ready").not("workspace_id", "is", null)
    .not("geography_retry_at", "is", null).lt("geography_attempts", 4);
  if (id) query = query.eq("id", id);
  else query = query.lte("geography_retry_at", new Date().toISOString());
  const { data, error } = await query.order("geography_retry_at").limit(id ? 1 : 3);
  if (error) throw error;
  return Promise.all((data ?? []).map(async row => {
    const attempt = row.geography_attempts + 1;
    const lease = new Date(Date.now() + 10 * 60_000).toISOString();
    const { data: claimed, error: claimError } = await admin.from("egg_topic_ideas")
      .update({ geography_attempts: attempt, geography_retry_at: lease })
      .eq("id", row.id).eq("updated_at", row.updated_at).eq("geography_attempts", row.geography_attempts)
      .eq("geography_retry_at", row.geography_retry_at).select("id,updated_at").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return { id: row.id, skipped: true };
    let patch: Record<string, unknown> = {};
    let failure = "no_verified_location";
    try {
      if (!row.geography_source_text) failure = "missing_original_source";
      else {
        const extracted = await extractTopicGeography(row.geography_source_text);
        if (extracted.geography_status === "resolved" || extracted.geography_status === "not_applicable") patch = extracted;
        // Search only if extraction still lacks a concrete place; retain country if search fails.
        const kind = patch.geography_kind || row.geography_kind;
        const localities = (patch.localities as string[] | undefined) || row.localities;
        if ((!patch.geography_status && row.geography_status !== "resolved") || (kind === "place" && !localities?.length)) {
          const researched = await researchTopicGeography(row.geography_source_text);
          if (researched) patch = researched;
        }
      }
    } catch { failure = "retry_request_failed"; }
    if (row.countries.length && Array.isArray(patch.countries) && row.countries.some((country: string) => !(patch.countries as string[]).includes(country))) {
      patch = {};
      failure = "country_conflict_requires_review";
    }
    const resolved = patch.geography_status === "resolved" || patch.geography_status === "not_applicable";
    // Never replace a previously confirmed country with unknown/empty data.
    if (row.countries.length && patch.geography_status === "not_applicable") patch = {};
    const done = resolved && Object.keys(patch).length > 0 && (patch.geography_kind !== "place" || (patch.localities as string[] | undefined)?.length);
    const exhausted = attempt >= 4 || failure === "missing_original_source" || failure === "country_conflict_requires_review";
    const { error: saveError } = await admin.from("egg_topic_ideas").update({
      ...patch,
      ...(exhausted && !resolved && row.geography_status === "pending" ? { geography_status: "unknown" } : {}),
      geography_attempts: attempt,
      geography_error: done ? null : exhausted ? `review_required:${failure}` : failure,
      geography_retry_at: done || exhausted ? null : new Date(Date.now() + attempt * 60 * 60_000).toISOString(),
    }).eq("id", row.id).eq("updated_at", claimed.updated_at).eq("geography_attempts", attempt).eq("geography_retry_at", lease);
    if (saveError) throw saveError;
    return { id: row.id, done: Boolean(done), review_required: Boolean(!done && exhausted) };
  }));
}
