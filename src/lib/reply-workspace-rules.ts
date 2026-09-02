import type { WorkspaceRole } from "@/lib/creator-workspace";
import { createEggAdmin } from "@/lib/creator-workspace";

const RULES_HEADING = "## 用家確認的回覆規則";

export async function saveApprovedReplyRule({
  admin,
  workspaceId,
  userId,
  role,
  instruction,
}: {
  admin: ReturnType<typeof createEggAdmin>;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole | null;
  instruction: string;
}) {
  if (role !== "owner") return { saved: false, warning: "只有工作空間擁有者可以儲存商務規則。" };
  const clean = instruction.replace(/\s+/g, " ").trim().slice(0, 1200);
  if (!clean) return { saved: false, warning: "修改指示係空白，未有儲存為商務規則。" };

  const { data: profile, error: readError } = await admin
    .from("egg_reply_prompt_profiles")
    .select("system_prompt")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (readError || !profile?.system_prompt) return { saved: false, warning: "草稿已更新，但暫時未能讀取商務規則。" };

  const rule = `- ${clean}`;
  if (profile.system_prompt.includes(rule)) return { saved: true, duplicate: true };
  const nextPrompt = `${profile.system_prompt.trim()}\n\n${profile.system_prompt.includes(RULES_HEADING) ? "" : `${RULES_HEADING}\n`}${rule}`.trim();
  if (nextPrompt.length > 50000) return { saved: false, warning: "草稿已更新，但商務規則已達字數上限。" };

  const { error: versionError } = await admin.from("egg_reply_prompt_versions").insert({
    workspace_id: workspaceId,
    system_prompt: nextPrompt,
    created_by: userId,
  });
  if (versionError) return { saved: false, warning: "草稿已更新，但暫時未能建立規則版本。" };

  const { error: saveError } = await admin.from("egg_reply_prompt_profiles").upsert({
    profile_key: `workspace_${workspaceId}`,
    workspace_id: workspaceId,
    system_prompt: nextPrompt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "profile_key" });
  return saveError
    ? { saved: false, warning: "草稿已更新，但暫時未能儲存商務規則。" }
    : { saved: true };
}

export function suggestReplyProjectName(brand: string, contact: string) {
  const valid = (value: string) => value && value !== "未提供" && value !== "未知";
  const parts = [brand, contact].filter(valid);
  return parts.length ? parts.join(" — ").slice(0, 80) : null;
}
