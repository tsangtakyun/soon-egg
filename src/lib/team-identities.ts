import type { SupabaseClient } from "@supabase/supabase-js";

type Member = { user_id: string; email: string; role: string; created_at?: string };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function publicIdentity(metadata: Record<string, unknown>, fallback: string) {
  const name = text(metadata.display_name) || text(metadata.full_name) || text(metadata.name) || fallback;
  const candidate = text(metadata.avatar_url) || text(metadata.picture);
  let avatarUrl: string | null = null;
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") avatarUrl = url.href;
  } catch { /* Missing/invalid photos use initials. */ }
  return { name, avatarUrl };
}

// Call only after authorizing membership and querying the current workspace.
// Auth account identity is deliberately separate from creator/workspace branding.
export async function teamIdentities(admin: SupabaseClient, members: Member[], viewerId: string, canManage: boolean) {
  const output = [];
  for (let index = 0; index < members.length; index += 4) {
    const batch = await Promise.all(members.slice(index, index + 4).map(async (member) => {
      const fallback = member.email?.split("@")[0] || "團隊成員";
      let identity = publicIdentity({}, fallback);
      try {
        const { data, error } = await admin.auth.admin.getUserById(member.user_id);
        if (!error && data.user) identity = publicIdentity(data.user.user_metadata ?? {}, fallback);
      } catch { /* Identity lookup failure must not hide the team roster. */ }
      return {
        user_id: member.user_id, role: member.role, created_at: member.created_at,
        ...identity, isSelf: member.user_id === viewerId,
        email: canManage || member.user_id === viewerId ? member.email : "",
      };
    }));
    output.push(...batch);
  }
  return output;
}
