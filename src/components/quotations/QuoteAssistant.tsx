"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import type { ReplyProject } from "@/app/(dashboard)/tools/reply/ReplyClient";

type PlacementMode = "none" | "code_only" | "managed";
type QuoteSnapshot = {
  total?: number; amount?: number; currency?: string; deliverable?: string; revisions?: number;
  placementMode?: PlacementMode; adPlacementDays?: number | null; adSpendAmount?: number;
  usageMonths?: number | null; paymentTerms?: string; signerName?: string;
  paymentRecipient?: string; paymentContact?: string; bonus?: string;
  missing?: string[]; conflicts?: string[];
};
type Quotation = { id: string; quote_number: string; version: number; status: "draft" | "approved" | "sent"; access_token: string; snapshot: QuoteSnapshot };
type QuotationPrefill = { amount: string; currency: string; deliverable: string; budgetText: string; amountNote: string };

const inputClass = "mt-1 h-11 w-full rounded-xl border bg-white px-3 text-zinc-950 placeholder:text-zinc-400";

export function QuoteAssistant({ project, canApprove }: { project: ReplyProject; canApprove: boolean }) {
  const [amount, setAmount] = useState("");
  const [deliverable, setDeliverable] = useState(project.brief.deliverables?.join("\n") || project.brief.collaborationType || "");
  const [revisions, setRevisions] = useState("2");
  const [placementMode, setPlacementMode] = useState<PlacementMode>("none");
  const [adPlacementDays, setAdPlacementDays] = useState("");
  const [adSpendAmount, setAdSpendAmount] = useState("");
  const [usageMonths, setUsageMonths] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [signerName, setSignerName] = useState("");
  const [paymentRecipient, setPaymentRecipient] = useState("");
  const [paymentContact, setPaymentContact] = useState("");
  const [bonus, setBonus] = useState("");
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [busy, setBusy] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [fps, setFps] = useState("");
  const [settingsNotice, setSettingsNotice] = useState("");
  const [prefill, setPrefill] = useState<QuotationPrefill | null>(null);
  const [commercialRules, setCommercialRules] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/quotations?projectId=${encodeURIComponent(project.id)}`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || "未能載入報價資料");
        const current = (data.quotations?.[0] ?? null) as Quotation | null;
        const snapshot = current?.snapshot;
        const payment = data.profile?.payment_profile ?? {};
        const rules = (data.profile?.commercial_rules ?? {}) as Record<string, unknown>;
        setQuotation(current);
        setPrefill(data.prefill ?? null);
        setCommercialRules(rules);
        setAmount(snapshot?.amount ? String(snapshot.amount) : String(data.prefill?.amount ?? ""));
        setDeliverable(snapshot?.deliverable || data.prefill?.deliverable || "");
        setRevisions(String(snapshot?.revisions ?? 2));
        setPlacementMode(snapshot?.placementMode ?? "none");
        setAdPlacementDays(snapshot?.adPlacementDays ? String(snapshot.adPlacementDays) : "");
        setAdSpendAmount(snapshot?.adSpendAmount ? String(snapshot.adSpendAmount) : "");
        setUsageMonths(snapshot?.usageMonths ? String(snapshot.usageMonths) : "");
        setPaymentTerms(snapshot?.paymentTerms || String(rules.payment_terms ?? ""));
        setSignerName(snapshot?.signerName || "");
        setPaymentRecipient(snapshot?.paymentRecipient || String(payment.account_name ?? ""));
        setPaymentContact(snapshot?.paymentContact || String(payment.payment_contact ?? ""));
        setBonus(snapshot?.bonus || "");
        setBankName(String(payment.bank_name ?? ""));
        setAccountName(String(payment.account_name ?? ""));
        setFps(String(payment.fps ?? ""));
      })
      .catch((cause) => !cancelled && setQuoteError(cause instanceof Error ? cause.message : "未能載入報價資料"));
    return () => { cancelled = true; };
  }, [project.id]);

  async function request(action?: "approve" | "sent") {
    setBusy(true);
    setQuoteError("");
    try {
      const payload = action ? { action, quotationId: quotation?.id } : {
        projectId: project.id, amount: Number(amount), deliverable, shootSessions: 1,
        revisions: Number(revisions), placementMode,
        adPlacementDays: Number(adPlacementDays) || undefined,
        adSpendAmount: Number(adSpendAmount) || undefined,
        usageMonths: Number(usageMonths) || undefined,
        bonus, paymentTerms, signerName, brandName: project.brief.brand,
        paymentRecipient, paymentContact,
      };
      const response = await fetch("/api/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error([data.error, ...(data.blockers || [])].filter(Boolean).join("："));
      setQuotation(data.quotation);
    } catch (cause) {
      setQuoteError(cause instanceof Error ? cause.message : "未能建立報價草稿");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!window.confirm("確認更新此工作空間的收款設定？WhatsApp 號碼不會自動改動 FPS、銀行或付款聯絡資料。")) return;
    setBusy(true);
    setSettingsNotice("");
    try {
      const response = await fetch("/api/quotations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_profile", currency: "HKD",
          commercialRules: {
            placement_fee_rate: commercialRules.placement_fee_rate ?? 0.10,
            usage_six_months_rate: commercialRules.usage_six_months_rate ?? 0.20,
            usage_twelve_months_rate: commercialRules.usage_twelve_months_rate ?? 0.30,
            payment_terms: paymentTerms,
          },
          paymentProfile: { bank_name: bankName, account_name: accountName, fps, payment_contact: paymentContact },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "未能儲存收款設定");
      setSettingsNotice("已儲存此工作空間的收款設定。");
    } catch (cause) {
      setQuoteError(cause instanceof Error ? cause.message : "未能儲存收款設定");
    } finally {
      setBusy(false);
    }
  }

  const blockers = [...(quotation?.snapshot.missing ?? []), ...(quotation?.snapshot.conflicts ?? [])];
  const statusLabel = quotation?.status === "draft" ? "草稿" : quotation?.status === "approved" ? "已批核" : "已發送";
  return <section className="rounded-2xl border-2 border-[#7b4a4f]/20 bg-[#fbf7f3] p-4">
    <h3 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4" />建立報價</h3>
    <p className="mt-1 text-xs text-zinc-500">已根據目前洽談摘要預先整理；你只需核對未確認資料。建立草稿唔代表客戶已接受合作。</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-zinc-800">基礎報價（{prefill?.currency || "HKD"}）<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="從已談銀碼自動帶入；未確認則留空" className={inputClass} />{prefill?.budgetText ? <span className={`mt-1 block text-[11px] leading-4 ${prefill.amount ? "text-emerald-700" : "text-amber-800"}`}>對話所述預算：{prefill.budgetText} · {prefill.amountNote}</span> : null}</label>
      <label className="text-xs font-semibold text-zinc-800">修改輪數<input inputMode="numeric" value={revisions} onChange={(event) => setRevisions(event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-semibold text-zinc-800 sm:col-span-2">合作內容（每行一項）<textarea rows={5} value={deliverable} onChange={(event) => setDeliverable(event.target.value)} placeholder={"IG Reel × 1\nIG Story × 1"} className="mt-1 min-h-28 w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-zinc-950 placeholder:text-zinc-400" /></label>
      <label className="text-xs font-semibold text-zinc-800">投放安排<select value={placementMode} onChange={(event) => setPlacementMode(event.target.value as PlacementMode)} className={inputClass}><option value="none">不包括投放</option><option value="code_only">只提供 Ad Code</option><option value="managed">代客戶投放</option></select></label>
      <label className="text-xs font-semibold text-zinc-800">投放／授權日數<input inputMode="numeric" value={adPlacementDays} onChange={(event) => setAdPlacementDays(event.target.value)} placeholder="例如 7" disabled={placementMode === "none"} className={`${inputClass} disabled:bg-zinc-100`} /></label>
      {placementMode === "managed" ? <label className="text-xs font-semibold text-zinc-800">客戶投放預算（HKD）<input inputMode="decimal" value={adSpendAmount} onChange={(event) => setAdSpendAmount(event.target.value)} placeholder="10% 代投費按此金額計算" className={inputClass} /></label> : null}
      <label className="text-xs font-semibold text-zinc-800">延伸使用權<select value={usageMonths} onChange={(event) => setUsageMonths(event.target.value)} className={inputClass}><option value="">不包括／待確認</option><option value="6">6 個月（+20%）</option><option value="12">12 個月（+30%）</option></select></label>
      <label className="text-xs font-semibold text-zinc-800 sm:col-span-2">付款條款<textarea rows={3} value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} placeholder="例如：確認後付 50% 訂金；發布後 30 日內付餘款" className="mt-1 min-h-20 w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-zinc-950 placeholder:text-zinc-400" /></label>
      <label className="text-xs font-semibold text-zinc-800">簽署人<input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="必須由人手確認" className={inputClass} /></label>
      <label className="text-xs font-semibold text-zinc-800">收款人／公司<input value={paymentRecipient} onChange={(event) => setPaymentRecipient(event.target.value)} placeholder="輸入收款人或公司名稱" className={inputClass} /></label>
      <label className="text-xs font-semibold text-zinc-800">付款聯絡方式<input value={paymentContact} onChange={(event) => setPaymentContact(event.target.value)} placeholder="電郵或電話；與 FPS 分開" className={inputClass} /></label>
      <label className="text-xs font-semibold text-zinc-800">額外贈送（可留空）<input value={bonus} onChange={(event) => setBonus(event.target.value)} placeholder="例如 IG Story 一篇" className={inputClass} /></label>
    </div>
    {quoteError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-800">{quoteError}</p> : null}
    {quotation ? <div className="mt-3 rounded-xl bg-white p-3 text-xs text-zinc-900"><p className="font-bold">{quotation.quote_number} · v{quotation.version} · {statusLabel}</p><p className="mt-1 text-lg font-bold">{quotation.snapshot.currency} {Number(quotation.snapshot.total || 0).toLocaleString()}</p>{blockers.length ? <p className="mt-2 text-amber-800">仍需確認：{blockers.join("、")}</p> : <p className="mt-2 text-emerald-700">資料已齊，可交由擁有者／管理員批核。</p>}</div> : null}
    <div className="mt-3 flex flex-wrap gap-2">
      <button disabled={busy || !amount.trim() || !deliverable.trim()} onClick={() => void request()} className="min-h-11 rounded-xl bg-zinc-950 px-4 text-xs font-bold text-white disabled:opacity-40">{busy ? "處理中…" : quotation ? "建立新草稿版本" : "建立報價草稿"}</button>
      {quotation?.status === "draft" && canApprove ? <button disabled={busy || blockers.length > 0} onClick={() => void request("approve")} className="min-h-11 rounded-xl bg-[#7b4a4f] px-4 text-xs font-bold text-white disabled:opacity-40">批核報價</button> : null}
      {quotation?.status === "approved" ? <><a target="_blank" rel="noreferrer" href={`/api/quotations/${quotation.id}/pdf?token=${quotation.access_token}`} className="flex min-h-11 items-center rounded-xl border bg-white px-4 text-xs font-bold">開啟 A4 報價</a>{canApprove ? <button disabled={busy} onClick={() => void request("sent")} className="min-h-11 rounded-xl border bg-white px-4 text-xs font-bold">標記已發送</button> : null}</> : null}
    </div>
    {canApprove ? <details className="mt-4 rounded-xl border bg-white p-3"><summary className="cursor-pointer text-xs font-bold">收款設定</summary><div className="mt-3 grid gap-2"><input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="銀行名稱" className={inputClass} /><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="戶口名稱" className={inputClass} /><input value={fps} onChange={(event) => setFps(event.target.value)} placeholder="FPS 登記資料" className={inputClass} /><input value={paymentContact} onChange={(event) => setPaymentContact(event.target.value)} placeholder="付款通知電郵／電話" className={inputClass} /><button disabled={busy} onClick={() => void saveSettings()} className="min-h-11 rounded-xl border px-4 text-xs font-bold">儲存收款設定</button>{settingsNotice ? <p className="text-emerald-700">{settingsNotice}</p> : null}</div></details> : null}
  </section>;
}
