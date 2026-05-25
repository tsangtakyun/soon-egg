import { masterSupabase } from "@/lib/supabase/master";

export async function getOrCreateKolWorkspace(eggUserId: string, email: string, displayName: string): Promise<string> {
  const { data: existing } = await (masterSupabase as any).from("workspaces").select("id").eq("owner_id", eggUserId).eq("type", "kol").maybeSingle();

  if (existing?.id) return existing.id;

  const { data: workspace, error } = await (masterSupabase as any)
    .from("workspaces")
    .insert({
      name: displayName || email,
      type: "kol",
      owner: email,
      owner_id: eggUserId,
      description: "KOL workspace",
    })
    .select("id")
    .single();

  if (error || !workspace?.id) {
    throw new Error(error?.message ?? "Unable to create KOL workspace");
  }

  return workspace.id;
}
