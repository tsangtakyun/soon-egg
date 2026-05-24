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

export function BriefCard({ brief }: { brief: ProjectBrief }) {
  const [expanded, setExpanded] = useState(false);

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
