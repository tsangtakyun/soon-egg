type Candidate = { id: string; recommendation_score?: number; want_to_create?: boolean };
// Rotate only within the best relevant candidates AFTER visible filters apply.
export function rotateRecommendations<T extends Candidate>(items: T[], previous: string[]): T[] {
  if (items.length < 2 || !previous.length) return items;
  const best = Math.max(...items.map(item => item.recommendation_score ?? 0));
  const pool = items.filter(item => (item.recommendation_score ?? 0) >= best - 6).slice(0, 8);
  if (pool.length < 2) return items;
  const last = previous[previous.length - 1];
  const next = pool.filter(item => item.id !== last).sort((a, b) => previous.lastIndexOf(a.id) - previous.lastIndexOf(b.id))[0];
  return next ? [next, ...items.filter(item => item.id !== next.id)] : items;
}
