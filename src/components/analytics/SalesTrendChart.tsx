"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type SalesTrendPoint = {
  month: string;
  amount: number;
};

export function SalesTrendChart({ data }: { data: SalesTrendPoint[] }) {
  const hasData = data.some((point) => point.amount > 0);

  return (
    <div className="rounded-2xl border bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold">貨品銷售趨勢</h2>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`HKD ${Number(value).toLocaleString()}`, "銷售額"]} />
            <Bar dataKey="amount" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-400">未有銷售記錄</div>
      )}
    </div>
  );
}
