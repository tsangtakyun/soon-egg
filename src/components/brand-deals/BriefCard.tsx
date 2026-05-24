"use client";

import { useState } from "react";

export type ProjectBrief = {
  id: string;
  creator_id: string;
  cw_brief_id: string;
  brand_name: string | null;
  title: string | null;
  background: string | null;
  objectives: string | null;
  deliverables: string[] | null;
  timeline: string | null;
  budget: string | null;
  dos: string | null;
  donts: string | null;
  reference_links: string[] | null;
  additional_notes: string | null;
  status: string | null;
  received_at: string | null;
  deal_status: string | null;
  kol_confirmed_at: string | null;
  kol_first_submission_date: string | null;
  kol_final_submission_date: string | null;
  kol_confirmation_notes: string | null;
};

type ConfirmationUpdate = {
  deal_status: string;
  kol_confirmed_at: string;
  kol_first_submission_date: string;
  kol_final_submission_date: string | null;
  kol_confirmation_notes: string | null;
};

function statusLabel(status: string | null) {
  if (status === "in_progress") return "進行中";
  if (status === "completed") return "已完成";
  return "已收到";
}

function statusClass(status: string | null) {
  if (status === "completed") return "bg-green-50 text-green-600";
  if (status === "in_progress") return "bg-amber-50 text-amber-600";
  return "bg-blue-50 text-blue-600";
}

export function BriefCard({
  brief,
  onConfirm,
}: {
  brief: ProjectBrief;
  onConfirm?: (briefId: string, confirmation: ConfirmationUpdate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [firstDate, setFirstDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isConfirmed =
    brief.deal_status === "confirmed" ||
    brief.deal_status === "in_progress" ||
    brief.deal_status === "submitted" ||
    brief.deal_status === "completed";

  async function handleConfirm() {
    if (!firstDate) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/briefs/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief_id: brief.id,
        first_submission_date: firstDate,
        final_submission_date: finalDate || null,
        notes: notes || null,
      }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok || !data.success) {
      setError(data.error || "確認失敗，請稍後再試。");
      return;
    }

    onConfirm?.(brief.id, data.confirmation as ConfirmationUpdate);
    setShowConfirmForm(false);
  }

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-zinc-950">{brief.title || "未命名簡報"}</h3>
          <p className="text-xs text-zinc-400">{brief.brand_name || "Brand"}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(brief.status)}`}>{statusLabel(brief.status)}</span>
      </div>

      {brief.deliverables && brief.deliverables.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {brief.deliverables.map((item) => (
            <span key={item} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {item}
            </span>
          ))}
        </div>
      )}

      {brief.budget && <p className="mb-2 text-xs text-zinc-500">預算：{brief.budget}</p>}
      {brief.timeline && <p className="mb-3 text-xs text-zinc-500">時間表：{brief.timeline}</p>}
      {brief.received_at && <p className="mb-3 text-xs text-zinc-400">{new Date(brief.received_at).toLocaleString("zh-HK")}</p>}

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs ${isConfirmed ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
          {isConfirmed ? "已確認合作" : "待確認"}
        </span>
        {brief.kol_first_submission_date && <span className="text-xs text-zinc-400">首次交稿：{brief.kol_first_submission_date}</span>}
      </div>

      <button onClick={() => setExpanded((value) => !value)} className="text-xs text-blue-600 hover:underline" type="button">
        {expanded ? "收起詳情" : "查看詳情 ›"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
          {brief.background && <Detail label="背景介紹" value={brief.background} />}
          {brief.objectives && <Detail label="合作目標" value={brief.objectives} />}
          {brief.dos && <Detail label="注意事項（要做）" value={brief.dos} />}
          {brief.donts && <Detail label="注意事項（不要做）" value={brief.donts} />}
          {brief.reference_links && brief.reference_links.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">參考連結</p>
              {brief.reference_links.map((link) => (
                <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-500 hover:underline">
                  {link}
                </a>
              ))}
            </div>
          )}
          {brief.additional_notes && <Detail label="補充備注" value={brief.additional_notes} />}
        </div>
      )}

      {!isConfirmed && !showConfirmForm && (
        <button
          onClick={() => setShowConfirmForm(true)}
          className="mt-3 w-full rounded-lg bg-black py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          type="button"
        >
          確認合作條款
        </button>
      )}

      {!isConfirmed && showConfirmForm && (
        <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
          <p className="text-xs font-medium text-zinc-600">確認合作條款</p>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">首次交稿日期 *</label>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-950"
              onChange={(event) => setFirstDate(event.target.value)}
              type="date"
              value={firstDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">最終交稿日期</label>
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-950"
              onChange={(event) => setFinalDate(event.target.value)}
              type="date"
              value={finalDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">備注（可選）</label>
            <textarea
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-950"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="有任何問題或說明..."
              rows={2}
              value={notes}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-lg bg-black py-2 text-sm text-white disabled:opacity-40"
              disabled={!firstDate || loading}
              onClick={() => void handleConfirm()}
              type="button"
            >
              {loading ? "提交中..." : "確認並提交"}
            </button>
            <button
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-500"
              onClick={() => {
                setShowConfirmForm(false);
                setError("");
              }}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-3 rounded-lg bg-green-50 px-3 py-2">
          <p className="text-xs text-green-600">
            已確認 · 首次交稿：{brief.kol_first_submission_date}
            {brief.kol_final_submission_date ? ` · 最終：${brief.kol_final_submission_date}` : ""}
          </p>
          {brief.kol_confirmation_notes && <p className="mt-0.5 text-xs text-green-700">{brief.kol_confirmation_notes}</p>}
        </div>
      )}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>
      <p className="text-xs leading-relaxed text-zinc-700">{value}</p>
    </div>
  );
}
