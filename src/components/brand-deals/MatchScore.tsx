export function MatchScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-sm font-semibold text-zinc-950">{score}</span>
    </div>
  );
}
