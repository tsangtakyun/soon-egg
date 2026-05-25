"use client";

import { useMemo, useState } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";

export type ScheduleItem = {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  type?: string | null;
  location?: string | null;
  created_at?: string | null;
};

const types = ["拍攝", "品牌合作", "會議", "個人", "其他"];

export function ScheduleClient({ schedules, balance }: { schedules: ScheduleItem[]; balance: number }) {
  const [items, setItems] = useState(schedules);
  const [showModal, setShowModal] = useState(false);
  const grouped = useMemo(() => {
    return items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
      const key = new Date(item.start_time).toLocaleDateString("zh-HK", { year: "numeric", month: "long" });
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {});
  }, [items]);

  async function deleteItem(id: string) {
    const res = await fetch("/api/tools/schedule/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">行程中心</h1>
          <p className="mt-2 text-sm text-zinc-500">集中管理拍攝、會議和品牌合作日程。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
            目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
          </div>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white" type="button">
            <Plus className="h-4 w-4" /> 新增行程
          </button>
        </div>
      </header>

      <section className="space-y-5">
        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-2xl border bg-white py-16 text-center text-sm text-zinc-400">暫未有行程</div>
        ) : (
          Object.entries(grouped).map(([month, monthItems]) => (
            <div key={month} className="rounded-2xl border bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">{month}</h2>
              <div className="divide-y">
                {monthItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 py-4">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <TypeBadge type={item.type ?? "其他"} />
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">{formatTimeRange(item.start_time, item.end_time)}</p>
                        {item.location && <p className="mt-1 text-xs text-zinc-400">{item.location}</p>}
                        {item.description && <p className="mt-2 text-xs leading-5 text-zinc-500">{item.description}</p>}
                      </div>
                    </div>
                    <button onClick={() => deleteItem(item.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-50" type="button">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {showModal && <ScheduleModal onClose={() => setShowModal(false)} onCreated={(item) => { setItems((current) => [...current, item].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())); setShowModal(false); }} />}
    </main>
  );
}

function ScheduleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (item: ScheduleItem) => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("拍攝");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function createSchedule() {
    if (!title.trim() || !startTime) return;
    setLoading(true);
    const res = await fetch("/api/tools/schedule/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, start_time: startTime, end_time: endTime || null, location, description }),
    });
    const data = await res.json();
    if (data.success) onCreated(data.schedule);
    else alert(`新增失敗：${data.error ?? "請稍後再試"}`);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold">新增行程</h3>
        <div className="mt-5 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="標題 *" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">{types.map((item) => <option key={item}>{item}</option>)}</select>
          <div className="grid grid-cols-2 gap-3">
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地點" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="備注" rows={3} className="w-full resize-none rounded-xl border px-3 py-2 text-sm" />
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={createSchedule} disabled={!title.trim() || !startTime || loading} className="flex-1 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-40" type="button">{loading ? "新增中..." : "新增"}</button>
          <button onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm text-zinc-500" type="button">取消</button>
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const cls = type === "拍攝" ? "bg-purple-50 text-purple-600" : type === "品牌合作" ? "bg-green-50 text-green-600" : type === "會議" ? "bg-blue-50 text-blue-600" : type === "個人" ? "bg-yellow-50 text-yellow-700" : "bg-zinc-100 text-zinc-500";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{type}</span>;
}

function formatTimeRange(start: string, end?: string | null) {
  const startLabel = new Date(start).toLocaleString("zh-HK");
  if (!end) return startLabel;
  return `${startLabel} - ${new Date(end).toLocaleString("zh-HK")}`;
}
