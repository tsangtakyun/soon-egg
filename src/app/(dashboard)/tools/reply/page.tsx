import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import { ReplyClient, type MayanMessage } from "./ReplyClient";
import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";

export default async function ReplyPage() {
  const { user } = await enterTool("reply", "進入回覆中心");
  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return <ReplyClient messages={[]} projects={[]} />;
  const admin = createEggAdmin();

  let { data: projects } = await admin
    .from("egg_reply_projects")
    .select("id,name,notes,tone,language,updated_at")
    .eq("creator_id", profile.id)
    .order("updated_at", { ascending: false });
  if (!projects?.length) {
    const { data: defaultProject } = await admin
      .from("egg_reply_projects")
      .insert({ creator_id: profile.id, name: "一般回覆" })
      .select("id,name,notes,tone,language,updated_at")
      .single();
    projects = defaultProject ? [defaultProject] : [];
  }
  const activeProject = projects[0] ?? null;

  const { data: migration, error: migrationLookupError } = await admin
    .from("egg_reply_history_migrations")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (migrationLookupError) {
    console.error("[reply centre] migration lookup failed", migrationLookupError.message);
  } else if (!migration) {
    const { data: legacyMessages, error: legacyReadError } = await masterSupabase
      .from("mayan_messages")
      .select("role,content,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (legacyReadError) {
      console.error("[reply centre] legacy history read failed", legacyReadError.message);
    } else {
      const { error: copyError } = legacyMessages?.length ? await admin.from("egg_reply_messages").insert(legacyMessages.map((message) => ({
        creator_id: profile.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at,
      }))) : { error: null };
      if (copyError) {
        console.error("[reply centre] legacy history copy failed", copyError.message);
      } else {
        const { error: markerError } = await admin.from("egg_reply_history_migrations").upsert({ user_id: user.id, creator_id: profile.id });
        if (markerError) console.error("[reply centre] migration marker failed", markerError.message);
      }
    }
  }

  if (activeProject) {
    const { error: assignmentError } = await admin.from("egg_reply_messages").update({ project_id: activeProject.id }).eq("creator_id", profile.id).is("project_id", null);
    if (assignmentError) console.error("[reply centre] project assignment failed", assignmentError.message);
  }

  const { data: messages } = await admin
    .from("egg_reply_messages")
    .select("id, role, content, created_at")
    .eq("creator_id", profile.id)
    .eq("project_id", activeProject?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: true })
    .limit(50);

  return <ReplyClient messages={(messages ?? []) as MayanMessage[]} projects={projects ?? []} />;
}
