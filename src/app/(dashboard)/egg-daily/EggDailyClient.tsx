"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Loader2,
  RefreshCw,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";

type Idea = {
  id: string;
  rank: number;
  title: string;
  angle: string;
  why_you: string;
  audience_value: string;
  production_mode: string;
  effort: string;
  source_topic_id: string | null;
};
export function EggDailyClient() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load(refresh = false) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/egg/daily${refresh ? "?refresh=1" : ""}`,
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setIdeas(result.recommendations ?? []);
      setDate(result.date ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暫時未能取得建議");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="min-h-screen bg-[#f7f7f8] px-4 pb-12 pt-[8vh] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              你的每日 Editorial Plan
            </p>
            <h1 className="mt-2 text-3xl font-black text-zinc-950">
              今日出咩？
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Egg 按你的 Creator DNA、最新題材和製作習慣，揀出今日最值得做的 3
              個內容。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {date ? (
              <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-500">
                {date}
              </span>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void load(true)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              更新今日建議
            </button>
          </div>
        </header>
        {loading ? (
          <div className="mt-8 flex min-h-72 items-center justify-center rounded-3xl border bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-600" />
              <p className="mt-3 text-sm font-bold">Egg 正在排今日內容…</p>
              <p className="mt-1 text-xs text-zinc-400">
                同一日只排一次，重新整理都會保留
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => void load()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              再試一次
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {ideas.map((idea, index) => (
              <article
                key={idea.id}
                className={`relative flex min-h-[390px] flex-col overflow-hidden rounded-3xl border p-5 shadow-sm ${index === 0 ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white"}`}
              >
                <span className="absolute right-4 top-2 text-7xl font-black text-zinc-950/[0.04]">
                  0{idea.rank}
                </span>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-black text-white">
                      {modeLabel(idea.production_mode)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {idea.effort}
                    </span>
                  </div>
                  <h2 className="mt-5 text-xl font-black leading-7 text-zinc-950">
                    {idea.title}
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-zinc-700">
                    {idea.angle}
                  </p>
                  <div className="mt-5 space-y-3 border-t border-zinc-200/80 pt-4">
                    <div className="flex gap-2">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <p className="text-xs leading-5 text-zinc-600">
                        <strong className="text-zinc-900">點解啱你：</strong>
                        {idea.why_you}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <p className="text-xs leading-5 text-zinc-600">
                        <strong className="text-zinc-900">觀眾得到：</strong>
                        {idea.audience_value}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/egg-this?input=${encodeURIComponent(`${idea.title}\n${idea.angle}`)}&mode=${encodeURIComponent(idea.production_mode)}${idea.source_topic_id ? `&topicId=${idea.source_topic_id}` : ""}`}
                  className="relative mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white"
                >
                  用呢個開始製作
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
        <section className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-white p-4">
          <WandSparkles className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <p className="text-sm font-black">你唔需要三個都做</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              揀今日最有精神完成的一個。當你修改及儲存 Content
              Pack，明日建議會更貼近你。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
function modeLabel(mode: string) {
  return (
    (
      {
        presenter: "真人出鏡",
        ai_visual: "AI 短片",
        carousel: "多圖圖卡",
        single_image: "單圖 Post",
        snapshot_reference: "拍攝參考圖",
      } as Record<string, string>
    )[mode] ?? "內容"
  );
}
