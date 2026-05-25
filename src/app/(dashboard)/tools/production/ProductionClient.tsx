"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type WorkItem = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
};

const columns = ["待拍攝", "拍攝中", "後製中", "已完成"];
const priorities = ["高", "中", "低"];

export function ProductionClient({ workItems, workspaceId, balance }: { workItems: WorkItem[]; workspaceId: string; balance: number }) {
  const [items, setItems] = useState(workItems);
  const [showModal, setShowModal] = useState(false);

  async function updateStatus(item: WorkItem, status: string) {
    const res = await fetch("/api/tools/production/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });
    const data = await res.json();
    if (data.success) setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status } : entry)));
  }

  async function deleteItem(id: string) {
    const res = await fetch("/api/tools/production/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) setItems((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">拍攝跟進</h1>
          <p className="mt-2 text-sm text-zinc-500">用看板整理拍攝、後製和交付進度。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
            目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
          </div>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white" type="button">
            <Plus className="h-4 w-4" aria-hidden />
            新增任務
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {columns.map((column) => (
          <div key={column} className="rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{column}</h2>
              <span className="text-xs text-zinc-400">{items.filter((item) => (item.status ?? "待拍攝") === column).length}</span>
            </div>
            <div className="space-y-3">
              {items
                .filter((item) => (item.status ?? "待拍攝") === column)
                .map((item) => (
                  <WorkCard key={item.id} item={item} onDelete={deleteItem} onMove={updateStatus} />
                ))}
            </div>
          </div>
        ))}
      </section>

      {showModal && (
        <TaskModal
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onCreated={(item) => {
            setItems((current) => [item, ...current]);
            setShowModal(false);
          }}
        />
      )}
    </main>
  );
}

function WorkCard({ item, onMove, onDelete }: { item: WorkItem; onMove: (item: WorkItem, status: string) => void; onDelete: (id: string) => void }) {
  const currentIndex = columns.indexOf(item.status ?? "待拍攝");
  const next = columns[currentIndex + 1];
  return (
    <div className="rounded-xl border bg-zinc-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-950">{item.title}</h3>
        <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-600" type="button">
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {item.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{item.description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <PriorityBadge priority={item.priority ?? "中"} />
        {item.due_date && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500">{item.due_date}</span>}
      </div>
      {item.tags && item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
              {tag}
            </span>
          ))}
        </div>
      )}
      {next && (
        <button onClick={() => onMove(item, next)} className="mt-3 w-full rounded-lg bg-white py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100" type="button">
          ▶ 移去 {next}
        </button>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = priority === "高" ? "bg-red-50 text-red-600" : priority === "中" ? "bg-yellow-50 text-yellow-700" : "bg-zinc-100 text-zinc-500";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{priority}</span>;
}

function TaskModal({ workspaceId, onClose, onCreated }: { workspaceId: string; onClose: () => void; onCreated: (item: WorkItem) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("中");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  async function createTask() {
    if (!title.trim()) return;
    setLoading(true);
    const res = await fetch("/api/tools/production/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, title, description, priority, due_date: dueDate || null, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) }),
    });
    const data = await res.json();
    if (data.success) onCreated(data.item);
    else alert(`新增失敗：${data.error ?? "請稍後再試"}`);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold">新增任務</h3>
        <div className="mt-5 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="標題 *" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述" rows={3} className="w-full resize-none rounded-xl border px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm">
              {priorities.map((option) => <option key={option}>{option}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
          </div>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="標籤，用逗號分隔" className="w-full rounded-xl border px-3 py-2 text-sm" />
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={createTask} disabled={!title.trim() || loading} className="flex-1 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-40" type="button">
            {loading ? "新增中..." : "新增"}
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm text-zinc-500" type="button">取消</button>
        </div>
      </div>
    </div>
  );
}
