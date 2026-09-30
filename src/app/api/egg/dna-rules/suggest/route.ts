import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";

export async function POST(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { data: signals, error } = await context.admin.from("egg_preference_signals").select("id,field_path,before_value,after_value").eq("workspace_id", context.workspaceId).eq("is_active", true).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "暫時未能分析 Creator DNA" }, { status: 500 });
  const groups = new Map<string, typeof signals>();
  for (const signal of signals ?? []) { const category = categoryFor(signal.field_path); groups.set(category, [...(groups.get(category) ?? []), signal]); }
  const eligible = [...groups.entries()].filter(([, items]) => items.length >= 2);
  if (!eligible.length) return NextResponse.json({ rules: [], message: "每個分類至少需要 2 個修改紀錄" });
  const anthropic = getAnthropic();
  const suggestions: Array<{ category: string; rule_text: string; evidence_signal_ids: string[]; evidence_count: number }> = [];
  for (const [category, items] of eligible) {
    let ruleText = fallbackRule(category);
    if (anthropic) {
      const response = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: `只根據以下修改，歸納一條簡短、可執行的創作者寫作偏好。不要提及題材、人名或地點，不要把單一字詞當永久規則。香港繁體中文，最多 45 字。只輸出 JSON：{"rule":"..."}\n分類：${category}\n修改：${JSON.stringify(items.map((item) => ({ before: item.before_value, after: item.after_value })))}` }] }, { timeout: 30_000, maxRetries: 1 });
      const text = response.content.find((part) => part.type === "text")?.text ?? "";
      ruleText = parseJsonFromText<{ rule: string }>(text, { rule: ruleText }).rule.slice(0, 120);
    }
    suggestions.push({ category, rule_text: ruleText, evidence_signal_ids: items.map((item) => item.id), evidence_count: items.length });
  }
  await context.admin.from("egg_creator_dna_rules").delete().eq("workspace_id", context.workspaceId).eq("status", "suggested");
  const { data: rules, error: insertError } = await context.admin.from("egg_creator_dna_rules").insert(suggestions.map((rule) => ({ ...rule, workspace_id: context.workspaceId, created_by: context.user.id }))).select("id,category,scope,rule_text,evidence_count,status,is_active,confirmed_at,created_at,updated_at");
  if (insertError) return NextResponse.json({ error: "暫時未能建立 DNA 建議" }, { status: 500 });
  return NextResponse.json({ rules: rules ?? [] });
}

function categoryFor(path: string) { if (path === "title") return "標題"; if (path === "hook") return "Hook"; if (path.includes("caption") || path.includes("cta")) return "Caption／CTA"; if (path.includes("host_lines") || path.includes("vo")) return "語氣／台詞"; if (/visual|image|shot|scene|reference|cover|slide/.test(path)) return "視覺方向"; return "其他"; }
function fallbackRule(category: string) { return category === "標題" ? "標題保持精簡具體，直接交代內容價值，避免過度誇張。" : `${category}要貼近用家的修改習慣，保持自然、具體和可直接使用。`; }
