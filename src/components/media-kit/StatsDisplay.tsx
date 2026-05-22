export function StatsDisplay({ stats }: { stats: { label: string; value: string; note?: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">{stat.label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-zinc-950">{stat.value}</div>
          {stat.note && <div className="mt-1 text-xs text-zinc-400">{stat.note}</div>}
        </div>
      ))}
    </div>
  );
}
