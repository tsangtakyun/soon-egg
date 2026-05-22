import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { StatsDisplay } from "@/components/media-kit/StatsDisplay";

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">數據分析</h1>
        <p className="mt-2 text-zinc-500">整合社交平台、主頁流量和產品銷售表現。</p>
      </div>
      <StatsDisplay
        stats={[
          { label: "Profile Views", value: "36.6K", note: "近 7 日" },
          { label: "Link Clicks", value: "8.0K", note: "CTR 21.8%" },
          { label: "Product Revenue", value: "HK$11.8K", note: "近 7 日" },
        ]}
      />
      <AnalyticsDashboard />
    </div>
  );
}
