"use client";

import { useState } from "react";
import { Check, Clipboard, FileText, Loader2, Save } from "lucide-react";

export type SavedScript = {
  id: string;
  title: string;
  topic?: string | null;
  background?: string | null;
  tone?: string | null;
  framework?: string | null;
  hook_variant?: string | null;
  ai_draft?: string | null;
  parts?: unknown;
  created_at?: string | null;
};

const languageOptions = ["廣東話", "普通話", "英文", "台灣中文"];
const toneOptions = ["紀錄片", "Vlog", "教學", "娛樂", "劇情"];
const frameworkOptions = ["問題解決", "旅遊探索", "產品評測", "故事敘述", "教學拆解"];
const hookOptions = ["懸念", "對比", "問題", "衝突", "統計震撼"];
const minuteOptions = [1, 3, 5, 10];

export function ScriptClient({
  scripts,
  balance: initialBalance,
}: {
  scripts: SavedScript[];
  workspaceId: string;
  userEmail: string;
  balance: number;
}) {
  const [title, setTitle] = useState("");
  const [background, setBackground] = useState("");
  const [tone, setTone] = useState("紀錄片");
  const [framework, setFramework] = useState("問題解決");
  const [hookVariant, setHookVariant] = useState("懸念");
  const [targetMinutes, setTargetMinutes] = useState(3);
  const [language, setLanguage] = useState("廣東話");
  const [generatedScript, setGeneratedScript] = useState("");
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>(scripts);
  const [showPrevious, setShowPrevious] = useState(true);

  async function handleGenerate() {
    if (!title.trim()) return;
    setLoading(true);
    const response = await fetch("/api/tools/script/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, background, tone, framework, hookVariant, targetMinutes, language }),
    });
    const data = await response.json();

    if (data.error === "Insufficient credits") {
      window.location.href = "/credits?insufficient=tools";
      return;
    }

    if (!response.ok) {
      alert(`生成失敗：${data.error ?? "請稍後再試"}`);
      setLoading(false);
      return;
    }

    setGeneratedScript(data.script ?? "");
    setGeneratedId(data.script_id ?? null);
    if (typeof data.balance === "number") setBalance(data.balance);
    if (data.saved) {
      setSavedScripts((current) => [data.saved, ...current.filter((script) => script.id !== data.saved.id)].slice(0, 5));
    }
    setLoading(false);
  }

  async function handleCopy() {
    if (!generatedScript) return;
    await navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">劇本工作台</h1>
          <p className="mt-2 text-sm text-zinc-500">將題材、背景資料和風格整理成可拍攝的完整劇本。</p>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
          目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">劇本設定</h2>
          <div className="space-y-4">
            <Field label="標題 / 題目">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：黑眼圈暗沉的科學解密"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300"
              />
            </Field>

            <Field label="背景資料">
              <textarea
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                placeholder="貼上研究筆記、產品重點、參考資料..."
                rows={6}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-purple-300"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="語言" value={language} onChange={setLanguage} options={languageOptions} />
              <SelectField label="風格" value={tone} onChange={setTone} options={toneOptions} />
              <SelectField label="框架" value={framework} onChange={setFramework} options={frameworkOptions} />
              <SelectField label="Hook 類型" value={hookVariant} onChange={setHookVariant} options={hookOptions} />
              <Field label="目標時長">
                <select
                  value={targetMinutes}
                  onChange={(event) => setTargetMinutes(Number(event.target.value))}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300"
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}分鐘
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!title.trim() || loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-40"
              type="button"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
              {loading ? "生成中..." : "AI 生成劇本"}
            </button>
            <p className="text-center text-xs text-zinc-400">每次 AI 生成扣 3 credits</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">生成劇本</h2>
                {generatedId && <p className="mt-1 text-xs text-zinc-400">已儲存至劇本庫</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!generatedScript}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                  type="button"
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Clipboard className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? "已複製" : "複製"}
                </button>
                <button
                  disabled={!generatedId}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-60"
                  type="button"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  已儲存
                </button>
              </div>
            </div>

            {generatedScript ? (
              <div className="whitespace-pre-wrap rounded-2xl bg-zinc-50 p-4 font-mono text-sm leading-7 text-zinc-800">{generatedScript}</div>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl bg-zinc-50 px-6 text-center text-sm text-zinc-400">
                填寫左邊設定後，生成的劇本會顯示在這裡。
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <button onClick={() => setShowPrevious((value) => !value)} className="flex w-full items-center justify-between text-left" type="button">
              <span className="text-sm font-semibold">最近劇本</span>
              <span className="text-xs text-zinc-400">{showPrevious ? "收起" : "展開"}</span>
            </button>
            {showPrevious && (
              <div className="mt-3 divide-y">
                {savedScripts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">暫未有劇本</p>
                ) : (
                  savedScripts.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => {
                        setTitle(script.title ?? "");
                        setBackground(script.background ?? "");
                        setTone(script.tone ?? "紀錄片");
                        setFramework(script.framework ?? "問題解決");
                        setHookVariant(script.hook_variant ?? "懸念");
                        setGeneratedScript(script.ai_draft ?? "");
                        setGeneratedId(script.id);
                      }}
                      className="block w-full py-3 text-left hover:bg-zinc-50"
                      type="button"
                    >
                      <p className="text-sm font-medium text-zinc-900">{script.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {[script.tone, script.framework, script.created_at ? new Date(script.created_at).toLocaleString("zh-HK") : null].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}
