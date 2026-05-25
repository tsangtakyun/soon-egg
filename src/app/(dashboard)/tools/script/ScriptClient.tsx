"use client";

import { useState } from "react";
import Link from "next/link";
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

type StyleOption = {
  code: string;
  title: string;
  description: string;
  example: string;
};

const industries = ["餐飲", "旅遊", "美容", "時尚", "生活", "文化", "科技", "教育", "其他"];

const hookStyles: StyleOption[] = [
  { code: "H1", title: "極端行動質問", description: "誇張行為/處境問觀眾", example: "你試過喺香港搵到一碗低過$30嘅靚湯未？" },
  { code: "H2", title: "真定假 — 直接挑戰", description: "質疑廣泛聲稱，邀請驗證", example: "成日話呢間係全港最好食，真定假呀？" },
  { code: "H3", title: "聽講 — 半信半疑", description: "借第三者放法引入懸念", example: "我朋友話呢度嘅咖啡係全城最好，我唔信。" },
  { code: "H4", title: "感官喚起 + 懸念", description: "啟動感官記憶再加轉折", example: "想像一下，第一口係焦糖，第二口係驚喜⋯⋯" },
  { code: "H5", title: "反差驚喜 — 竟然", description: "意想不到對比，情緒跳躍", example: "呢間藏係工廠大廈嘅餐廳，竟然係米芝蓮推介。" },
  { code: "H6", title: "意外自我披露", description: "個人誠洞拉近距離", example: "我試過為咗呢碗麵坐一個鐘車，值唔值？" },
  { code: "H7", title: "荒誕事實", description: "真實但荒謬嘅事，引發驚訝", example: "咩話？！香港有間咖啡店，閒日要排隊三個鐘。" },
  { code: "H8", title: "代入感假設", description: "「如果」句式引觀眾想像", example: "如果你只有$100，你會點喺香港食到最好？" },
];

const transitionStyles: StyleOption[] = [
  { code: "T1", title: "情緒代入 — 同行感", description: "主持緊張，拉觀眾入狀態", example: "好，我依家入去喇，你哋跟住我。" },
  { code: "T2", title: "轉念 — 入去先信咗", description: "懷疑被現實正面打臉", example: "我本來唔信，但入到去就知我錯咗。" },
  { code: "T3", title: "質疑名氣 — 實力存疑", description: "對名氣打預防針", example: "有名就一定好食？我嚟幫你哋試。" },
  { code: "T4", title: "實測宣言 — 等我試下", description: "宣佈「我幫你試」", example: "唔講咁多，我親自試晒每一款。" },
  { code: "T5", title: "場景切割 — 另有真相", description: "意想不到角度重新定義", example: "但係等等，我發現咗一樣你哋唔知嘅事。" },
  { code: "T6", title: "第一印象反轉", description: "坦白第一眼唔係咁吸引", example: "老實講，第一眼我覺得好普通，但係⋯⋯" },
  { code: "T7", title: "靈魂轉移 — 重點喺呢度", description: "真正精華喺另一樣", example: "啲人嚟係為咗咖啡，但係我係為咗呢個。" },
  { code: "T8", title: "頓悟時刻", description: "具體動作到情感領悟", example: "食第一口嗰陣，我明白點解佢可以撐三十年。" },
];

const endingStyles: StyleOption[] = [
  { code: "E1", title: "留白式 Verdict", description: "坦白收，短句，唔誇張", example: "值唔值得去？你知我點諗。" },
  { code: "E2", title: "值唔值得 — 親身作答", description: "回應開場，直接給答案", example: "三個鐘車程值唔值？我下個月仲會返嚟。" },
  { code: "E3", title: "情懷翻轉 — 真材實料", description: "老字號就算真實力", example: "三十年，唔係靠宣傳，係靠呢碗湯。" },
  { code: "E4", title: "自嘲收尾 — 解鎖", description: "輕鬆收，帶幽默", example: "好，我又解鎖咗一個令荷包縮水嘅地方。" },
  { code: "E5", title: "詩意留白", description: "短句節奏，情緒拉遠", example: "有啲味道，係會記一世嘅。" },
  { code: "E6", title: "個人感悟 — 超越食玩", description: "升華到人生意義", example: "呢度令我記起，簡單嘅嘢有時最難得。" },
  { code: "E7", title: "哲學收結", description: "帶哲學重量，適合文化題", example: "一個地方能撐幾十年，從來唔係靠運氣。" },
];

export function ScriptClient({
  scripts,
  balance: initialBalance,
}: {
  scripts: SavedScript[];
  workspaceId: string;
  userEmail: string;
  balance: number;
}) {
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [background, setBackground] = useState("");
  const [hookStyle, setHookStyle] = useState("H1");
  const [transitionStyle, setTransitionStyle] = useState("T1");
  const [endingStyle, setEndingStyle] = useState("E1");
  const [generatedScript, setGeneratedScript] = useState("");
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>(scripts);
  const [showPrevious, setShowPrevious] = useState(true);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    const response = await fetch("/api/tools/script/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName, industry, topic, background, hookStyle, transitionStyle, endingStyle }),
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
    if (data.saved) setSavedScripts((current) => [data.saved, ...current.filter((script) => script.id !== data.saved.id)].slice(0, 5));
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
      <header className="overflow-hidden rounded-3xl border bg-white">
        <div className="h-44 bg-[radial-gradient(circle_at_20%_20%,#ede9fe,transparent_30%),linear-gradient(135deg,#7c3aed,#111827)]" />
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
            <h1 className="mt-2 text-3xl font-black text-zinc-950">劇本工作台</h1>
            <p className="mt-2 text-sm text-zinc-500">用 IG Reel 節奏設計 Hook、轉場同 Ending。</p>
          </div>
          <div className="rounded-2xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
            目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <NumberedSection number="01" title="品牌 / 個人名稱">
            <input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="例：銀幸の美學 Ginkgo Beauty" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300" />
          </NumberedSection>

          <NumberedSection number="02" title="行業 / 類型">
            <div className="flex flex-wrap gap-2">
              {industries.map((item) => (
                <button key={item} onClick={() => toggleIndustry(item, setIndustry)} className={`rounded-full border px-4 py-2 text-xs font-medium ${industry.includes(item) ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-500"}`} type="button">
                  {item}
                </button>
              ))}
            </div>
          </NumberedSection>

          <NumberedSection number="03" title="主題">
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="例：最強宵夜滷肉飯？全世界最靚聖誕市集？" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300" />
          </NumberedSection>

          <NumberedSection number="04" title="完整背景資料">
            <textarea value={background} onChange={(event) => setBackground(event.target.value)} placeholder="例：係老字號，成立1920年，主打豬油糕同老婆餅…" rows={6} className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-purple-300" />
          </NumberedSection>

          <NumberedSection number="05" title="Hook 風格">
            <StyleGrid options={hookStyles} selected={hookStyle} onSelect={setHookStyle} />
          </NumberedSection>

          <NumberedSection number="06" title="轉場風格">
            <StyleGrid options={transitionStyles} selected={transitionStyle} onSelect={setTransitionStyle} />
          </NumberedSection>

          <NumberedSection number="07" title="Ending 風格">
            <StyleGrid options={endingStyles} selected={endingStyle} onSelect={setEndingStyle} />
          </NumberedSection>

          <button onClick={handleGenerate} disabled={!topic.trim() || loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-4 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-40" type="button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
            {loading ? "生成中..." : "AI 生成 IG Reel 劇本"}
          </button>
          <p className="text-center text-xs text-zinc-400">每次 AI 生成扣 3 credits</p>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-2xl border bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">生成劇本</h2>
                {generatedId && <p className="mt-1 text-xs text-zinc-400">已儲存至劇本庫</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopy} disabled={!generatedScript} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40" type="button">
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Clipboard className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? "已複製" : "複製"}
                </button>
                <button disabled={!generatedId} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-60" type="button">
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  已儲存
                </button>
              </div>
            </div>

            {generatedScript ? (
              <>
                <div className="max-h-[560px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-zinc-50 p-4 font-mono text-sm leading-7 text-zinc-800">{generatedScript}</div>
                <Link href={`/tools/storyboard?script=${encodeURIComponent(generatedScript.substring(0, 500))}`} prefetch={false} className="mt-3 block text-xs font-medium text-purple-600 hover:underline">
                  → 推去分鏡工作台
                </Link>
              </>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl bg-zinc-50 px-6 text-center text-sm text-zinc-400">完成 01-07 後，生成劇本會顯示在這裡。</div>
            )}
          </div>

          <RecentScripts
            scripts={savedScripts}
            open={showPrevious}
            onToggle={() => setShowPrevious((value) => !value)}
            onSelect={(script) => {
              setTopic(script.title ?? "");
              setBackground(script.background ?? "");
              setHookStyle(script.hook_variant ?? "H1");
              setGeneratedScript(script.ai_draft ?? "");
              setGeneratedId(script.id);
            }}
          />
        </aside>
      </section>
    </main>
  );
}

function NumberedSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs font-bold text-purple-600">{number}</span>
        <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StyleGrid({ options, selected, onSelect }: { options: StyleOption[]; selected: string; onSelect: (code: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {options.map((option) => (
        <StyleCard key={option.code} {...option} selected={selected === option.code} onClick={() => onSelect(option.code)} />
      ))}
    </div>
  );
}

function StyleCard({ code, title, description, example, selected, onClick }: StyleOption & { selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-4 transition-all ${selected ? "border-purple-600 bg-purple-600 text-white" : "border-gray-200 bg-white hover:border-purple-300"}`}
      style={{ minHeight: "110px" }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`text-xs font-semibold ${selected ? "opacity-60" : "text-gray-400"}`}>{code}</span>
        <span className={`text-sm font-semibold ${selected ? "text-white" : "text-gray-800"}`}>{title}</span>
      </div>
      <p className={`mb-2 text-xs ${selected ? "text-purple-200" : "text-gray-400"}`}>{description}</p>
      <p className={`border-t pt-2 text-xs italic leading-relaxed ${selected ? "border-purple-400 text-purple-100" : "border-gray-100 text-gray-500"}`}>「{example}」</p>
    </div>
  );
}

function RecentScripts({ scripts, open, onToggle, onSelect }: { scripts: SavedScript[]; open: boolean; onToggle: () => void; onSelect: (script: SavedScript) => void }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left" type="button">
        <span className="text-sm font-semibold">最近劇本</span>
        <span className="text-xs text-zinc-400">{open ? "收起" : "展開"}</span>
      </button>
      {open && (
        <div className="mt-3 divide-y">
          {scripts.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">暫未有劇本</p>
          ) : (
            scripts.map((script) => (
              <button key={script.id} onClick={() => onSelect(script)} className="block w-full py-3 text-left hover:bg-zinc-50" type="button">
                <p className="text-sm font-medium text-zinc-900">{script.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{[script.hook_variant, script.created_at ? new Date(script.created_at).toLocaleString("zh-HK") : null].filter(Boolean).join(" · ")}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function toggleIndustry(item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
  setter((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
}
