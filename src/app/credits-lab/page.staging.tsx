"use client";
import { useEffect, useState, type FormEvent } from "react";

type Status = { workspaceId: string; role: string; period: { available: number; allowance: number; period_end: string } | null;
  operations: { call_id: string; credit_status: string; provider_status: string; amount: number; refund_due_at: string | null }[];
  results: { call_id: string; payload: { label: string; text?: string }; created_at: string }[] };
type Session = { userId: string; members: { workspace_id: string; role: string }[]; status: Status | null };
const inputStyle = { padding: 12, border: "1px solid #a9a19b", borderRadius: 8, color: "#211b19", background: "#fff", width: "100%" };
const buttonStyle = { padding: "12px 18px", borderRadius: 8, background: "#78474c", color: "#fff", border: 0, margin: "8px 8px 8px 0", cursor: "pointer" };
async function readSession(): Promise<Session | null> {
  const response = await fetch("/api/staging-credits", { cache: "no-store" });
  const data = await response.json();
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(data.error ?? "載入失敗");
  return data;
}
export default function Lab() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("載入中…");
  const [key, setKey] = useState("");
  const [prompt, setPrompt] = useState("固定測試素材");
  const [scenario, setScenario] = useState("success");
  async function refresh() {
    setSession(await readSession());
  }
  useEffect(() => {
    let active = true;
    readSession().then(data => {
      if (active) { setSession(data); setKey(crypto.randomUUID()); setNotice(""); }
    }).catch(() => { if (active) setNotice("無法載入，請重試"); });
    return () => { active = false; };
  }, []);
  async function send(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setNotice("處理中…");
    try {
      const response = await fetch("/api/staging-credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "操作失敗");
      await refresh(); setNotice(data.reused ? "重複請求：沿用已保存狀態，冇再扣點。" : "操作完成，以下為資料庫最新狀態。");
    } catch (error) { setNotice(error instanceof Error ? error.message : "操作失敗"); }
    finally { setBusy(false); }
  }
  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    form.reset(); // don't persist passwords in React state/localStorage
    void send({ action: "login", email: String(fields.get("email") ?? ""), password });
  }
  const status = session?.status;
  return <main style={{ maxWidth: 900, margin: "30px auto", padding: 20 }}>
    <h1 style={{ fontSize: 28 }}>EGG 點數測試 Lab</h1>
    <p>獨立 staging · 真實登入／資料庫 · 固定 mock · 非 AI 生成 · 不收費</p>
    <p role="status" aria-live="polite">{notice}</p>
    {!session ? <form onSubmit={login} style={{ maxWidth: 440 }}>
      <label>測試帳戶電郵<input required type="email" name="email" autoComplete="username" style={inputStyle} /></label>
      <label>密碼<input required type="password" name="password" autoComplete="current-password" style={inputStyle} /></label>
      <button disabled={busy} style={buttonStyle}>登入 staging</button>
      <p>只用 staging 測試帳戶；不會建立會員／接受邀請或初始化舊點數。</p>
    </form> : <>
      <p>已登入：{session.userId}</p>
      <button disabled={busy} style={buttonStyle} onClick={() => send({ action: "logout" })}>登出</button>
      <button disabled={busy} style={buttonStyle} onClick={() => { setNotice("重新載入…"); refresh().then(() => setNotice("重新載入完成")).catch(() => setNotice("載入失敗")); }}>重新讀取資料庫</button>
      <h2>工作空間（只列已確認成員資格）</h2>
      {session.members.length === 0 && <p>此測試帳戶未加入任何工作空間，不能啟用或扣點。</p>}
      {session.members.map(m => <button key={m.workspace_id} disabled={busy} style={buttonStyle} onClick={() => send({ action: "select", workspaceId: m.workspace_id })}>{m.workspace_id} · {m.role}</button>)}
      {status && <section>
        <h2>目前：{status.workspaceId} · {status.role}</h2>
        <p>點數：{status.period ? `${status.period.available} / ${status.period.allowance}` : "尚未啟用試用"}</p>
        <button disabled={busy || status.role !== "owner"} style={buttonStyle} onClick={() => send({ action: "start" })}>啟用／重試啟用試用</button>
        <label>請求識別碼（重試保持不變）<input style={inputStyle} value={key} onChange={e => setKey(e.target.value)} /></label>
        <button disabled={busy} style={buttonStyle} onClick={() => setKey(crypto.randomUUID())}>新請求識別碼</button>
        <label>測試文字<input style={inputStyle} maxLength={2000} value={prompt} onChange={e => setPrompt(e.target.value)} /></label>
        <label>模擬結果<select style={inputStyle} value={scenario} onChange={e => setScenario(e.target.value)}>
          <option value="success">成功：保存固定結果並扣 5 點</option><option value="failure">已確認失敗：立即退點</option><option value="unknown">狀態未知：等 15 分鐘，人工恢復</option>
        </select></label>
        <button disabled={busy || !status.period} style={buttonStyle} onClick={() => send({ action: "run", key, prompt, scenario })}>執行／相同識別碼重試</button>
        <h2>操作紀錄</h2>
        {status.operations.length === 0 && <p>暫無操作</p>}
        {status.operations.map(op => <article key={op.call_id} style={{ padding: 16, border: "1px solid #ccc", marginBottom: 10 }}>
          <p>{op.call_id}</p><p>{op.credit_status} · {op.provider_status} · {op.amount} 點</p>
          {op.refund_due_at && <p>退款時間：{op.refund_due_at}</p>}
          {op.provider_status === "unknown" && <button disabled={busy} style={buttonStyle} onClick={() => send({ action: "late", callId: op.call_id })}>模擬遲到結果（不再次 dispatch）</button>}
        </article>)}
        <h2>已持久保存結果</h2>
        {status.results.map(r => <article key={r.call_id} style={{ padding: 16, border: "1px solid #ccc", marginBottom: 10 }}><strong>{r.payload.label}</strong><p>{r.payload.text}</p><p>{r.call_id} · {r.created_at}</p></article>)}
        <p>未知操作由授權者喺 staging SQL 手動呼叫已批准 recovery RPC；本頁冇全域恢復、排程或真 provider。</p>
      </section>}
    </>}
  </main>;
}
