"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Megaphone, ShieldCheck } from "lucide-react";

type Account = { id: string; name?: string; account_status?: number; currency?: string };
type Page = { id: string; name?: string; instagram_business_account?: { id?: string; username?: string } };
type Post = { id: string; title?: string; body?: string; image_url?: string; permalink?: string };
type Setup = { connected: boolean; appLive: boolean; canManageAds: boolean; brandName: string; permissions: Array<{ permission?: string; status?: string }>; adAccounts: Account[]; pages: Page[]; posts: Post[] };
type Result = { campaignId?: string; adSetId?: string; creativeIds?: string[]; adIds?: string[]; message?: string };
const steps = ["連接", "目標", "主題", "素材", "檢查", "投放設定"];
const objectives = [
  ["awareness", "品牌知名度", "接觸更多可能記住你的受眾"],
  ["traffic", "網站流量", "引導受眾前往網站或個人頁面"],
  ["engagement", "內容互動", "增加讚好、留言及內容互動"],
  ["leads", "潛在客戶", "引導受眾前往登記或查詢頁面"],
] as const;

export function MetaAdsClient({ workspaceName, canManage }: { workspaceName: string; canManage: boolean }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [launchAttemptId] = useState(() => crypto.randomUUID());
  const [adAccountId, setAdAccountId] = useState("");
  const [pageId, setPageId] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [objective, setObjective] = useState<"awareness" | "traffic" | "engagement" | "leads">("awareness");
  const [targetLink, setTargetLink] = useState("https://egg.sooncreator.network/");
  const [topic, setTopic] = useState("");
  const [headline, setHeadline] = useState("睇更多精彩內容");
  const [caption, setCaption] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [dailyBudget, setDailyBudget] = useState(80);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [country, setCountry] = useState("HK");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch("/api/meta-ads/setup", { cache: "no-store" }).then(async (response) => ({ response, data: await response.json().catch(() => ({})) })).then(({ response, data }) => {
      if (!response.ok) throw new Error(data.error || "未能讀取 Meta Ads 連接");
      setSetup(data);
      const account = data.adAccounts?.find((item: Account) => item.account_status === 1);
      const page = data.pages?.[0];
      if (account) setAdAccountId(account.id);
      if (page) { setPageId(page.id); setInstagramAccountId(page.instagram_business_account?.id || ""); }
      setCampaignName(`${data.brandName || workspaceName} — ${new Date().toLocaleDateString("zh-HK")}`);
      setTopic(`推廣 ${data.brandName || workspaceName} 的創作者內容`);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "載入失敗")).finally(() => setLoading(false));
  }, [workspaceName]);

  const missingAdsPermission = Boolean(setup?.connected) && !(setup?.permissions?.some((item) => item.permission === "ads_management" && item.status === "granted") && setup?.permissions?.some((item) => item.permission === "ads_read" && item.status === "granted"));
  const selectedPage = useMemo(() => setup?.pages?.find((page) => page.id === pageId), [pageId, setup?.pages]);
  const currency = setup?.adAccounts?.find((account) => account.id === adAccountId)?.currency || "帳戶貨幣";
  const adsManagerUrl = result?.campaignId ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(adAccountId.replace(/^act_/, ""))}&selected_campaign_ids=${encodeURIComponent(result.campaignId)}` : "";

  function next() {
    setError("");
    if (step === 0 && (!adAccountId || !pageId)) return setError("請選擇可用 Ad Account 及 Facebook Page");
    if (step === 1 && !targetLink.trim()) return setError("請輸入推廣網址");
    if (step === 2 && !topic.trim()) return setError("請輸入 Campaign 主題");
    if (step === 3 && !selectedPostIds.length) return setError("請至少選擇一個素材");
    setStep((value) => Math.min(5, value + 1));
  }
  async function launch() {
    if (!confirmed) return setError("請先確認所有項目會真實建立到 Meta，並保持 PAUSED");
    setLaunching(true); setError("");
    try {
      const response = await fetch("/api/meta-ads/launch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ launchAttemptId, adAccountId, pageId, instagramAccountId, objective, targetLink, topic, headline, caption, callToAction, postIds: selectedPostIds, campaignName, dailyBudget, ageMin, ageMax, countries: [country] }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "未能建立 Meta Campaign");
      setResult(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "未能建立 Meta Campaign"); }
    finally { setLaunching(false); }
  }

  return <div className="px-5 py-8 sm:px-8 lg:px-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white"><Megaphone className="h-5 w-5" /></div><h1 className="text-3xl font-bold text-zinc-950">Meta Ads</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">用自己嘅 Meta Ad Account 推廣 Instagram 內容。所有項目建立後一律保持 PAUSED。</p></div><span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">真實 Meta Marketing API</span></header>
    {!canManage ? <div className="max-w-3xl rounded-2xl border bg-white p-6 text-sm text-zinc-600">只有 Workspace Owner 或 Admin 可以建立 Meta Ads。</div> :
    <section className="max-w-5xl overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="flex gap-2 overflow-x-auto border-b px-5 py-4">{steps.map((label, index) => <span key={label} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${index <= step ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-400"}`}>{index + 1} {label}</span>)}</div>
      <div className="min-h-[480px] p-5 sm:p-8">
        {loading ? <p className="py-24 text-center text-sm text-zinc-400">正在讀取 Meta 帳戶及素材…</p> : result ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><CheckCircle2 className="mb-3 h-8 w-8 text-emerald-600" /><h2 className="text-xl font-bold">Campaign 已建立到 Meta</h2><p className="mt-2 text-sm text-emerald-800">{result.message}</p><div className="mt-5 grid gap-2 rounded-xl bg-white/70 p-4 text-sm"><span>Campaign ID：{result.campaignId}</span><span>Ad Set ID：{result.adSetId}</span><span>Creative ID：{result.creativeIds?.join("、") || "—"}</span><span>Ad ID：{result.adIds?.join("、") || "—"}</span></div>{adsManagerUrl ? <a href={adsManagerUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white">前往 Meta Ads Manager 檢查並啟用 <ExternalLink className="h-4 w-4" /></a> : null}</div> : <>
          {error ? <div role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {step === 0 ? <div className="space-y-5"><h2 className="text-2xl font-bold">連接 Meta Ads 帳戶</h2>{!setup?.connected || missingAdsPermission ? <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900"><p>{setup?.connected ? "目前授權未包含 ads_management／ads_read，需要重新授權。" : "尚未連接可管理廣告的 Meta 帳戶。"}</p><button type="button" onClick={() => window.location.assign("/api/auth/instagram?ads=true&next=/meta-ads")} className="mt-4 inline-flex rounded-xl bg-zinc-950 px-4 py-2.5 font-semibold text-white">連接／重新授權 Meta</button></div> : null}<Field label="Ad Account"><select value={adAccountId} onChange={(event) => setAdAccountId(event.target.value)} className="input"><option value="">請選擇</option>{setup?.adAccounts?.map((account) => <option key={account.id} value={account.id} disabled={account.account_status !== 1}>{account.name || account.id} · {account.currency || ""}</option>)}</select></Field><Field label="Facebook Page"><select value={pageId} onChange={(event) => { const id = event.target.value; setPageId(id); setInstagramAccountId(setup?.pages?.find((page) => page.id === id)?.instagram_business_account?.id || ""); }} className="input"><option value="">請選擇</option>{setup?.pages?.map((page) => <option key={page.id} value={page.id}>{page.name || page.id}</option>)}</select></Field><Field label="Instagram Account"><input readOnly className="input bg-zinc-50" value={selectedPage?.instagram_business_account?.username || instagramAccountId || "此 Page 未連接 Instagram Business"} /></Field></div> : null}
          {step === 1 ? <div className="space-y-5"><h2 className="text-2xl font-bold">設定廣告目標</h2><div className="grid gap-3 sm:grid-cols-2">{objectives.map(([value, label, description]) => <button type="button" key={value} onClick={() => setObjective(value)} className={`rounded-2xl border p-5 text-left ${objective === value ? "border-zinc-950 ring-1 ring-zinc-950" : "border-zinc-200"}`}><strong>{label}</strong><span className="mt-1 block text-sm text-zinc-500">{description}</span></button>)}</div><Field label="推廣網址"><input className="input" value={targetLink} onChange={(event) => setTargetLink(event.target.value)} /></Field></div> : null}
          {step === 2 ? <div className="space-y-5"><h2 className="text-2xl font-bold">Campaign 主題</h2><Field label="今次想推廣甚麼？"><textarea className="input min-h-36" value={topic} onChange={(event) => setTopic(event.target.value)} /></Field></div> : null}
          {step === 3 ? <div className="space-y-5"><h2 className="text-2xl font-bold">選擇 Instagram 素材</h2><p className="text-sm text-zinc-500">最多選擇 5 個已同步圖片／Carousel 內容。</p><Field label="廣告標題"><input className="input" value={headline} onChange={(event) => setHeadline(event.target.value)} /></Field><Field label="廣告文字"><textarea className="input min-h-28" value={caption} onChange={(event) => setCaption(event.target.value)} /></Field><Field label="行動按鈕"><select className="input" value={callToAction} onChange={(event) => setCallToAction(event.target.value)}><option value="LEARN_MORE">了解更多</option><option value="SHOP_NOW">立即購買</option><option value="CONTACT_US">聯絡我們</option><option value="SIGN_UP">立即登記</option></select></Field><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{setup?.posts?.map((post) => { const selected = selectedPostIds.includes(post.id); return <button type="button" key={post.id} onClick={() => setSelectedPostIds((current) => selected ? current.filter((id) => id !== post.id) : current.length < 5 ? [...current, post.id] : current)} className={`overflow-hidden rounded-2xl border text-left ${selected ? "border-zinc-950 ring-2 ring-zinc-950" : "border-zinc-200"}`}><img src={post.image_url} alt="" className="aspect-square w-full object-cover" /><span className="block truncate p-3 text-xs font-medium">{post.title}</span></button>; })}</div></div> : null}
          {step === 4 ? <div className="space-y-5"><h2 className="text-2xl font-bold">檢查 Campaign</h2><Field label="Campaign 名稱"><input className="input" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></Field><div className="space-y-2 rounded-2xl bg-zinc-50 p-5 text-sm"><p>目標：{objectives.find(([value]) => value === objective)?.[1]}</p><p>網址：{targetLink}</p><p>主題：{topic}</p><p>素材：{selectedPostIds.length} 個</p></div></div> : null}
          {step === 5 ? <div className="space-y-5"><h2 className="text-2xl font-bold">投放設定</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="最低年齡"><input type="number" min="18" max="65" className="input" value={ageMin} onChange={(event) => setAgeMin(Number(event.target.value))} /></Field><Field label="最高年齡"><input type="number" min="18" max="65" className="input" value={ageMax} onChange={(event) => setAgeMax(Number(event.target.value))} /></Field><Field label="地區"><select className="input" value={country} onChange={(event) => setCountry(event.target.value)}><option value="HK">香港</option><option value="TW">台灣</option><option value="SG">新加坡</option><option value="MY">馬來西亞</option><option value="JP">日本</option><option value="KR">韓國</option><option value="GB">英國</option><option value="US">美國</option></select></Field><Field label={`每日預算（${currency}）`}><input type="number" min="1" className="input" value={dailyBudget} onChange={(event) => setDailyBudget(Number(event.target.value))} /></Field></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" /><div><strong>真實 Meta API 建立</strong><p className="mt-1 text-sm text-amber-800">Campaign、Ad Set、Creative 及 Ad 全部建立為 PAUSED，不會自動投放或扣款。</p></div></div><label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium"><input type="checkbox" className="mt-0.5 h-5 w-5" checked={confirmed} disabled={!setup?.appLive} onChange={(event) => setConfirmed(event.target.checked)} />我確認以上資料正確並建立到 Meta</label>{!setup?.appLive ? <p className="mt-4 rounded-xl bg-white/70 p-3 text-sm text-red-700">Meta App 尚未公開，暫時無法建立廣告創意。請完成 App Review 並將 production `META_APP_LIVE` 設為 true。</p> : null}</div></div> : null}
        </>}
      </div>
      {!loading && !result ? <footer className="flex items-center justify-between border-t px-5 py-4"><button type="button" disabled={step === 0 || launching} onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-xl border px-4 py-2.5 text-sm disabled:opacity-40">返回</button>{step < 5 ? <button type="button" onClick={next} className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white">繼續</button> : <button type="button" disabled={launching || !setup?.appLive || !confirmed} onClick={() => void launch()} className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{launching ? "正在建立…" : "建立到 Meta"}</button>}</footer> : null}
    </section>}
    <style jsx global>{`.input{width:100%;border:1px solid #d4d4d8;border-radius:.75rem;background:#fff;padding:.75rem .875rem;color:#18181b;outline:none}.input:focus{border-color:#18181b;box-shadow:0 0 0 1px #18181b}.input:read-only{color:#52525b}`}</style>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-zinc-800">{label}<div className="mt-2">{children}</div></label>; }
