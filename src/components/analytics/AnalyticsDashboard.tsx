"use client";

import dynamic from "next/dynamic";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { analyticsSeries } from "@/lib/mock-data";

const AnalyticsChart = dynamic(() => Promise.resolve(ChartInner), {
  ssr: false,
  loading: () => <div className="h-full rounded-lg bg-zinc-100" />,
});

export function AnalyticsDashboard() {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-zinc-950">主頁流量與轉換</h2>
          <p className="mt-1 text-sm text-zinc-500">近 7 日 profile views、link clicks 和產品收入。</p>
        </div>
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">+18.4% WoW</div>
      </div>
      <div className="mt-6 h-80">
        <AnalyticsChart />
      </div>
    </section>
  );
}

function ChartInner() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={analyticsSeries}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="day" stroke="#71717a" />
        <YAxis stroke="#71717a" />
        <Tooltip />
        <Area type="monotone" dataKey="views" stroke="#18181b" fill="#d4d4d8" name="Views" />
        <Area type="monotone" dataKey="clicks" stroke="#f59e0b" fill="#fde68a" name="Clicks" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
