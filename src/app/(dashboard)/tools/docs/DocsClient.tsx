"use client";

import { useState } from "react";
import { FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

export type Doc = {
  id: string;
  user_id?: string;
  workspace_id?: string;
  title: string;
  content: string | null;
  type: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const docTypes = ["企劃書", "合作提案", "創作筆記", "其他"];

export function DocsClient({ docs, workspaceId, balance: initialBalance }: { docs: Doc[]; workspaceId: string; balance: number }) {
  const [items, setItems] = useState(docs);
  const [selectedId, setSelectedId] = useState(docs[0]?.id ?? "");
  const selected = items.find((doc) => doc.id === selectedId);
  const [draft, setDraft] = useState<Doc>(selected ?? newDoc(workspaceId));
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [balance, setBalance] = useState(initialBalance);

  function selectDoc(doc: Doc) {
    setSelectedId(doc.id);
    setDraft(doc);
  }

  function createNew() {
    setSelectedId("");
    setDraft(newDoc(workspaceId));
  }

  async function saveDoc() {
    if (!draft.title.trim()) return;
    setLoading(true);
    const res = await fetch("/api/tools/docs/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (data.success) {
      setItems((current) => [data.doc, ...current.filter((doc) => doc.id !== data.doc.id)]);
      setSelectedId(data.doc.id);
      setDraft(data.doc);
    } else alert(`儲存失敗：${data.error ?? "請稍後再試"}`);
    setLoading(false);
  }

  async function enhance() {
    if (!draft.content?.trim()) return;
    setEnhancing(true);
    const res = await fetch("/api/tools/docs/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft.content, type: draft.type }),
    });
    const data = await res.json();
    if (data.error === "Insufficient credits") {
      window.location.href = "/credits?insufficient=tools";
      return;
    }
    if (data.content) setDraft((current) => ({ ...current, content: data.content }));
    if (typeof data.balance === "number") setBalance(data.balance);
    setEnhancing(false);
  }

  async function deleteDoc(id: string) {
    const res = await fetch("/api/tools/docs/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      const next = items.filter((doc) => doc.id !== id);
      setItems(next);
      setSelectedId(next[0]?.id ?? "");
      setDraft(next[0] ?? newDoc(workspaceId));
    }
  }

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">文件中心</h1>
          <p className="mt-2 text-sm text-zinc-500">整理企劃書、合作提案和創作筆記。</p>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
          目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border bg-white p-4">
          <button onClick={createNew} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-medium text-white" type="button">
            <Plus className="h-4 w-4" /> 新增文件
          </button>
          <div className="space-y-2">
            {items.map((doc) => (
              <button key={doc.id} onClick={() => selectDoc(doc)} className={`w-full rounded-xl border p-3 text-left ${selectedId === doc.id ? "border-purple-300 bg-purple-50" : "bg-white"}`} type="button">
                <p className="text-sm font-semibold">{doc.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{doc.type} · {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("zh-HK") : ""}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-2xl border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">文件編輯器</h2>
            {selectedId && <button onClick={() => deleteDoc(selectedId)} className="rounded-lg p-2 text-red-400 hover:bg-red-50" type="button"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <div className="space-y-4">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="標題" className="w-full rounded-xl border px-3 py-2.5 text-sm" />
            <select value={draft.type ?? "其他"} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
              {docTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            <textarea value={draft.content ?? ""} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={22} className="w-full resize-none rounded-xl border px-3 py-2.5 font-mono text-sm leading-6" placeholder="輸入文件內容..." />
            <div className="flex gap-3">
              <button onClick={enhance} disabled={!draft.content?.trim() || enhancing} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium text-purple-600 disabled:opacity-40" type="button">
                {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI 完善內容
              </button>
              <button onClick={saveDoc} disabled={!draft.title.trim() || loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-40" type="button">
                <FileText className="h-4 w-4" />
                {loading ? "儲存中..." : "儲存"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function newDoc(workspaceId: string): Doc {
  return { id: "", workspace_id: workspaceId, title: "", content: "", type: "創作筆記" };
}
