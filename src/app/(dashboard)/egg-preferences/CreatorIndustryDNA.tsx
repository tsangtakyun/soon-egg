"use client";
import { useEffect, useState } from "react";
import { DNA_INDUSTRIES, DNA_FORMATS, EMPTY_DNA, dnaBody, dnaList, type CreatorDNA } from "@/lib/creator-dna";

export function CreatorIndustryDNA() {
  const [profile, setProfile] = useState<CreatorDNA | null>(null);
  const [styles, setStyles] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/egg/creator-dna", { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then(data => { setProfile({ ...EMPTY_DNA, ...data.profile }); setStyles((data.profile?.content_styles || []).join("、")); setCanEdit(data.canEdit === true); })
      .catch(() => { if (!controller.signal.aborted) setMessage("未能載入 Creator DNA"); });
    return () => controller.abort();
  }, [attempt]);
  async function save() {
    if (!profile || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/egg/creator-dna", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dnaBody({ ...profile, content_styles: dnaList(styles) })) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "未能儲存");
      setProfile(data.profile); setMessage(data.warning || "已儲存，下次更新推薦時生效。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "未能儲存，請重試"); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-3xl border border-amber-200 bg-white p-5">
    <h2 className="text-xl font-bold">推薦偏好</h2>
    <p className="mt-2 text-sm text-zinc-500">隨時調整你的內容方向，App 與網站同步使用。</p>
    {!profile ? <p className="mt-4">{message || "正在載入…"}{message ? <button className="ml-3 min-h-11" onClick={() => { setMessage(""); setAttempt(n => n + 1); }}>重試</button> : null}</p> : <>
      {!canEdit ? <p className="mt-3 text-sm">只有工作區擁有者或管理員可以修改。</p> : null}
      <fieldset disabled={!canEdit || busy} className="mt-5 space-y-5">
        <label className="block">主分類<select className="mt-2 block w-full rounded-xl border p-3 text-zinc-900 placeholder:text-gray-500" value={profile.primary_industry_code} onChange={e => setProfile({ ...profile, primary_industry_code: e.target.value, secondary_industry_codes: profile.secondary_industry_codes.filter(v => v !== e.target.value) })}><option value="">請選擇</option>{DNA_INDUSTRIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div><p>次分類（最多兩個）</p><div className="mt-2 flex flex-wrap gap-2">{DNA_INDUSTRIES.filter(([value]) => value !== profile.primary_industry_code).map(([value, label]) => <button type="button" key={value} aria-pressed={profile.secondary_industry_codes.includes(value)} disabled={!profile.secondary_industry_codes.includes(value) && profile.secondary_industry_codes.length >= 2} onClick={() => setProfile({ ...profile, secondary_industry_codes: profile.secondary_industry_codes.includes(value) ? profile.secondary_industry_codes.filter(v => v !== value) : [...profile.secondary_industry_codes, value] })} className={`min-h-11 rounded-full border px-4 disabled:opacity-40 ${profile.secondary_industry_codes.includes(value) ? "bg-amber-100 border-amber-600" : ""}`}>{label}</button>)}</div></div>
        <label className="block">內容風格<input maxLength={400} className="mt-2 block w-full rounded-xl border p-3 text-zinc-900 placeholder:text-gray-500" value={styles} onChange={e => setStyles(e.target.value)} placeholder="例如：探店、實測、知識分享（以逗號分隔）" /></label>
        <div><p>偏好格式</p><div className="mt-2 flex flex-wrap gap-2">{DNA_FORMATS.map(([value, label]) => <button type="button" key={value} aria-pressed={profile.preferred_formats.includes(value)} className={`min-h-11 rounded-full border px-4 ${profile.preferred_formats.includes(value) ? "bg-amber-100 border-amber-600" : ""}`} onClick={() => setProfile({ ...profile, preferred_formats: profile.preferred_formats.includes(value) ? profile.preferred_formats.filter(v => v !== value) : [...profile.preferred_formats, value] })}>{label}</button>)}</div></div>
        <label className="block">目標受眾<p className="mt-1 text-sm text-gray-500">描述你想吸引的觀眾，而非創作者簡介或平台功能；請確認現有內容是否合適。</p><textarea maxLength={1000} className="mt-2 block w-full rounded-xl border p-3 text-zinc-900 placeholder:text-gray-500" value={profile.audience_summary || ""} onChange={e => setProfile({ ...profile, audience_summary: e.target.value })} placeholder="例如：親子家庭、美食愛好者" /></label>
        <button type="button" disabled={!profile.primary_industry_code} onClick={() => void save()} className="min-h-11 rounded-xl bg-zinc-950 px-5 text-white disabled:opacity-40">{busy ? "儲存中…" : "儲存偏好"}</button>
      </fieldset>
      {message ? <p role="status" className="mt-4 text-sm">{message}</p> : null}
    </>}
  </section>;
}
