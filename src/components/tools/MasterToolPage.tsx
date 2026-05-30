import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { masterSupabaseAdmin } from "@/lib/supabase-master";

type ToolKey = "ideas" | "scripts" | "projects" | "schedules" | "reply_threads" | "soon_ai";

const toolConfig: Record<ToolKey, { table?: string; title: string; subtitle: string; empty: string }> = {
  ideas: { table: "ideas", title: "題材庫", subtitle: "IG Idea Library", empty: "暫時未有題材" },
  scripts: { table: "scripts", title: "劇本生成", subtitle: "Script Generator", empty: "暫時未有劇本" },
  projects: { table: "projects", title: "工作板", subtitle: "Work Board", empty: "暫時未有項目" },
  schedules: { table: "schedules", title: "日程", subtitle: "Schedule", empty: "暫時未有日程" },
  reply_threads: { table: "reply_threads", title: "回覆中心", subtitle: "Reply Centre", empty: "暫時未有回覆 thread" },
  soon_ai: { title: "SOON AI", subtitle: "AI Assistant", empty: "SOON AI 會使用 Master credits 扣 3 Credits/次" },
};

type MasterRow = {
  id: string | number;
  title?: string | null;
  topic?: string | null;
  sender_name?: string | null;
  original_message?: string | null;
  summary?: string | null;
  notes?: string | null;
  ai_draft?: string | null;
  status?: string | null;
  created_at?: string | null;
};

async function getMasterIdentity() {
  const supabase = await createClient();
  const { data: { user } = { user: null } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const email = user?.email?.trim().toLowerCase();

  if (!user || !email) return null;

  const { data: credits } = await masterSupabaseAdmin
    .from("user_credits")
    .select("egg_user_id, user_id, email")
    .eq("email", email)
    .maybeSingle();

  return {
    email,
    eggUserId: (credits?.egg_user_id || credits?.user_id || user.id) as string,
  };
}

function buildInsertPayload(tool: ToolKey, eggUserId: string, title: string, notes: string) {
  if (tool === "ideas") {
    return {
      user_id: eggUserId,
      workspace_id: eggUserId,
      title,
      topic: title,
      summary: notes,
      notes,
      description: notes,
      platform: "instagram",
      type: "reel",
      country: "HK",
      region: "HK",
      tags: ["HK"],
      categories: ["HK"],
      viral_score: 0,
      ai_viral_base: 0,
      viral_potential: "medium",
      date: new Date().toISOString(),
    };
  }

  if (tool === "scripts") {
    return {
      user_id: eggUserId,
      workspace_id: eggUserId,
      title,
      topic: title,
      background: notes,
      ai_draft: notes,
      qc_final: notes,
      industry: "創作",
      hook_code: "H1",
      trans_code: "T1",
      ending_code: "E1",
      generated_at: new Date().toISOString(),
    };
  }

  if (tool === "projects") {
    return {
      workspace_id: eggUserId,
      user_id: eggUserId,
      created_by: eggUserId,
      title,
      notes,
      type: "instagram",
      status: "構思中",
      current_stage: "構思中",
      pipeline_step: "idea",
      category: "創作",
    };
  }

  if (tool === "schedules") {
    const now = new Date();
    return {
      workspace_id: eggUserId,
      user_id: eggUserId,
      title,
      description: notes,
      notes,
      type: "other",
      status: "即將到來",
      date: now.toISOString().slice(0, 10),
      start_at: now.toISOString(),
    };
  }

  return {
    workspace_id: eggUserId,
    created_by: eggUserId,
    sender_name: title,
    original_message: notes || title,
    status: "pending",
    inbox_type: "instagram",
    notes,
  };
}

function rowTitle(row: MasterRow, tool: ToolKey) {
  if (tool === "reply_threads") return row.sender_name || "未命名對話";
  return row.title || row.topic || "未命名";
}

function rowBody(row: MasterRow, tool: ToolKey) {
  if (tool === "reply_threads") return row.original_message || row.notes || "";
  return row.summary || row.notes || row.ai_draft || "";
}

export async function MasterToolPage({ tool }: { tool: ToolKey }) {
  const config = toolConfig[tool];
  const identity = await getMasterIdentity();

  async function createItem(formData: FormData) {
    "use server";

    const nextIdentity = await getMasterIdentity();
    const nextConfig = toolConfig[tool];
    if (!nextIdentity || !nextConfig.table) return;

    const title = String(formData.get("title") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    if (!title) return;

    const payload = buildInsertPayload(tool, nextIdentity.eggUserId, title, notes) as Record<string, unknown>;

    await masterSupabaseAdmin
      .from(nextConfig.table)
      .insert(payload);

    revalidatePath(`/tools/${tool === "ideas" ? "idea-library" : tool === "scripts" ? "script-generator" : tool === "projects" ? "work-board" : tool === "reply_threads" ? "reply-centre" : tool === "soon_ai" ? "soon-ai" : "schedule"}`);
  }

  if (!identity) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-950">{config.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">請先登入 SOON-EGG。</p>
        </div>
      </div>
    );
  }

  if (tool === "soon_ai") {
    return (
      <div className="space-y-5 px-6 py-6">
        <Header title={config.title} subtitle={config.subtitle} />
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm leading-6 text-zinc-600">
            SOON AI 已連接 Master Credits。正式對話 UI 會沿用現有右側 SOON AI panel；每次 AI 生成應透過
            <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5">/api/credits/deduct</code>
            扣除 3 Credits。
          </p>
        </div>
      </div>
    );
  }

  const table = config.table!;
  const query = masterSupabaseAdmin
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data, error } = await query.or(
    table === "reply_threads"
      ? `workspace_id.eq.${identity.eggUserId},created_by.eq.${identity.eggUserId}`
      : `workspace_id.eq.${identity.eggUserId},user_id.eq.${identity.eggUserId}`
  );

  const rows = error ? [] : ((data ?? []) as MasterRow[]);

  return (
    <div className="space-y-5 px-6 py-6">
      <Header title={config.title} subtitle={config.subtitle} />

      <form action={createItem} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]">
          <input
            name="title"
            required
            placeholder="標題"
            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-amber-300"
          />
          <input
            name="notes"
            placeholder="備註 / 內容"
            className="rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-amber-300"
          />
          <button type="submit" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
            新增
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">{config.empty}</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <div key={String(row.id)} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-zinc-950">{rowTitle(row, tool)}</h2>
                  {row.status ? <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">{row.status}</span> : null}
                </div>
                {rowBody(row, tool) ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">{rowBody(row, tool)}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-amber-700">{subtitle}</p>
      <h1 className="mt-1 text-3xl font-black text-zinc-950">{title}</h1>
    </div>
  );
}
