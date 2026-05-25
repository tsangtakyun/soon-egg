"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type Expense = {
  id: string;
  user_id?: string;
  workspace_id?: string | null;
  date: string;
  merchant?: string | null;
  description?: string | null;
  amount: number;
  original_amount?: number | null;
  original_currency?: string | null;
  converted_amount?: number | null;
  converted_currency?: string | null;
  category?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type EntryType = "income" | "expense";

const currencies = ["HKD", "TWD", "SGD", "USD"];
const incomeCategories = ["品牌合作", "產品銷售", "顧問服務", "其他收入"];
const expenseCategories = ["器材設備", "道具", "交通", "餐飲", "軟體訂閱", "其他支出"];
const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-zinc-500"];

export function FinanceClient({ expenses, balance }: { expenses: Expense[]; balance: number }) {
  const [items, setItems] = useState(expenses);
  const [activeTab, setActiveTab] = useState<"records" | "new">("records");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const monthItems = useMemo(() => items.filter((item) => item.date?.startsWith(month)), [items, month]);
  const yearItems = useMemo(() => items.filter((item) => item.date?.startsWith(new Date().getFullYear().toString())), [items]);
  const monthIncome = sum(monthItems.filter((item) => Number(item.amount) > 0));
  const monthExpense = Math.abs(sum(monthItems.filter((item) => Number(item.amount) < 0)));
  const yearTotal = sum(yearItems);
  const groupedByDate = groupByDate(monthItems);
  const categoryBreakdown = buildCategoryBreakdown(monthItems);

  async function deleteExpense(id: string) {
    const res = await fetch("/api/tools/finance/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expense_id: id }),
    });
    const data = await res.json();
    if (data.success) setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">財務中心</h1>
          <p className="mt-2 text-sm text-zinc-500">追蹤創作者收入、支出和淨收益。</p>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
          目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="本月收入" value={money(monthIncome)} sub={month} color="bg-green-500" />
        <KpiCard label="本月支出" value={money(monthExpense)} sub={month} color="bg-red-500" />
        <KpiCard label="淨收益" value={money(monthIncome - monthExpense)} sub="收入 - 支出" color="bg-purple-500" />
        <KpiCard label="今年累計" value={money(yearTotal)} sub={`${new Date().getFullYear()} 全年`} color="bg-blue-500" />
      </section>

      <div className="flex border-b">
        <button onClick={() => setActiveTab("records")} className={`px-5 py-3 text-sm font-medium ${activeTab === "records" ? "border-b-2 border-black text-black" : "text-zinc-400"}`} type="button">收支記錄</button>
        <button onClick={() => setActiveTab("new")} className={`px-5 py-3 text-sm font-medium ${activeTab === "new" ? "border-b-2 border-black text-black" : "text-zinc-400"}`} type="button">新增記錄</button>
      </div>

      {activeTab === "records" ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">收支記錄</h2>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm" />
            </div>
            {Object.keys(groupedByDate).length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-400">本月暫未有記錄</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedByDate).map(([date, records]) => (
                  <div key={date}>
                    <p className="mb-2 text-xs font-medium text-zinc-400">{new Date(date).toLocaleDateString("zh-HK", { month: "long", day: "numeric", weekday: "short" })}</p>
                    <div className="divide-y rounded-2xl border">
                      {records.map((item) => (
                        <RecordRow key={item.id} expense={item} onDelete={deleteExpense} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold">類別總覽</h2>
            {categoryBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">暫無分類資料</p>
            ) : (
              <div className="space-y-4">
                {categoryBreakdown.map((entry, index) => (
                  <div key={entry.category}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-zinc-600">{entry.category}</span>
                      <span className="font-medium text-zinc-900">{money(entry.amount)} ({entry.percent}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className={`h-2 rounded-full ${colors[index % colors.length]}`} style={{ width: `${entry.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <NewRecordForm
          onCreated={(expense) => {
            setItems((current) => [expense, ...current]);
            setActiveTab("records");
          }}
        />
      )}
    </main>
  );
}

function NewRecordForm({ onCreated }: { onCreated: (expense: Expense) => void }) {
  const [type, setType] = useState<EntryType>("income");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("HKD");
  const [category, setCategory] = useState(incomeCategories[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const categories = type === "income" ? incomeCategories : expenseCategories;

  function updateType(nextType: EntryType) {
    setType(nextType);
    setCategory(nextType === "income" ? incomeCategories[0] : expenseCategories[0]);
  }

  async function submit() {
    if (!amount || !date) return;
    setLoading(true);
    const res = await fetch("/api/tools/finance/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, date, merchant, description, amount: Number(amount), currency, category, notes }),
    });
    const data = await res.json();
    if (data.success) onCreated(data.expense);
    else alert(`儲存失敗：${data.error ?? "請稍後再試"}`);
    setLoading(false);
  }

  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="mb-5 text-sm font-semibold">新增收支記錄</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2 flex gap-2">
          <button onClick={() => updateType("income")} className={`flex-1 rounded-xl border py-2.5 text-sm font-medium ${type === "income" ? "border-green-500 bg-green-50 text-green-700" : "text-zinc-500"}`} type="button">收入</button>
          <button onClick={() => updateType("expense")} className={`flex-1 rounded-xl border py-2.5 text-sm font-medium ${type === "expense" ? "border-red-500 bg-red-50 text-red-600" : "text-zinc-500"}`} type="button">支出</button>
        </div>
        <Input label="日期" type="date" value={date} onChange={setDate} />
        <label>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">貨幣</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">{currencies.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <Input label="商戶 / 來源" value={merchant} onChange={setMerchant} />
        <Input label="描述" value={description} onChange={setDescription} />
        <Input label="金額" type="number" value={amount} onChange={setAmount} />
        <label>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">類別</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">{categories.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <div className="md:col-span-2">
          <Input label="備注" value={notes} onChange={setNotes} />
        </div>
      </div>
      <button onClick={submit} disabled={!amount || !date || loading} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40" type="button">
        <Plus className="h-4 w-4" />
        {loading ? "儲存中..." : "儲存記錄"}
      </button>
    </section>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm" />
    </label>
  );
}

function RecordRow({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  const amount = Number(expense.amount ?? 0);
  const isIncome = amount >= 0;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isIncome ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
          {categoryIcon(expense.category, isIncome)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{expense.merchant || expense.category || "未命名"}</p>
          <p className="truncate text-xs text-zinc-400">{expense.description || expense.notes || expense.category}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`text-sm font-semibold ${isIncome ? "text-green-600" : "text-red-500"}`}>
          {isIncome ? "+" : "-"}{expense.original_currency ?? "HKD"} {Math.abs(amount).toLocaleString()}
        </span>
        <button onClick={() => onDelete(expense.id)} className="rounded-lg p-2 text-red-300 hover:bg-red-50 hover:text-red-500" type="button">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{sub}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl ${color}`} />
      </div>
    </div>
  );
}

function groupByDate(items: Expense[]) {
  return items.reduce<Record<string, Expense[]>>((acc, item) => {
    acc[item.date] = acc[item.date] ? [...acc[item.date], item] : [item];
    return acc;
  }, {});
}

function buildCategoryBreakdown(items: Expense[]) {
  const totals = items.reduce<Record<string, number>>((acc, item) => {
    const key = item.category ?? "其他";
    acc[key] = (acc[key] ?? 0) + Math.abs(Number(item.amount ?? 0));
    return acc;
  }, {});
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount, percent: total ? Math.round((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

function sum(items: Expense[]) {
  return items.reduce((total, item) => total + Number(item.amount ?? 0), 0);
}

function money(amount: number) {
  return `HKD ${Math.round(amount).toLocaleString()}`;
}

function categoryIcon(category?: string | null, isIncome = false) {
  if (isIncome) return "$";
  if (category === "交通") return "T";
  if (category === "餐飲") return "F";
  if (category === "器材設備") return "E";
  return "-";
}
