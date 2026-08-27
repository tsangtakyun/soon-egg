"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type InstagramTrendPoint = {
  date: string;
  followers: number;
  reach: number | null;
  engagementRate: number | null;
};

export function InstagramTrendChart({ data }: { data: InstagramTrendPoint[] }) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Instagram 趨勢</h2>
      <p className="mt-1 text-xs text-zinc-400">
        每日保存粉絲、7 日觸及及互動率快照。
      </p>
      {data.length < 2 ? (
        <div className="mt-4 flex h-56 items-center justify-center rounded-xl bg-zinc-50 px-6 text-center text-sm text-zinc-400">
          已開始記錄真實數據；累積至少兩日後會顯示升跌趨勢。
        </div>
      ) : (
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="followers" tick={{ fontSize: 11 }} width={55} />
              <YAxis
                yAxisId="reach"
                orientation="right"
                tick={{ fontSize: 11 }}
                width={55}
              />
              <Tooltip
                formatter={(value, name) => [
                  Number(value ?? 0).toLocaleString("zh-HK"),
                  name === "followers" ? "粉絲" : "7 日觸及",
                ]}
              />
              <Line
                yAxisId="followers"
                type="monotone"
                dataKey="followers"
                name="followers"
                stroke="#ec4899"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="reach"
                type="monotone"
                dataKey="reach"
                name="reach"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
