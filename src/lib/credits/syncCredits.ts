import { masterSupabaseAdmin } from "@/lib/supabase-master";

export async function syncUserCredits(eggUserId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!eggUserId || !normalizedEmail) return;

  const { data: existing } = await masterSupabaseAdmin
    .from("user_credits")
    .select("user_id, balance")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!existing) {
    await masterSupabaseAdmin
      .from("user_credits")
      .insert({
        user_id: eggUserId,
        egg_user_id: eggUserId,
        email: normalizedEmail,
        balance: 300,
        total_purchased: 300,
        total_used: 0,
        source: "soon_egg",
      });
    return;
  }

  await masterSupabaseAdmin
    .from("user_credits")
    .update({ egg_user_id: eggUserId, updated_at: new Date().toISOString() })
    .eq("email", normalizedEmail);
}
