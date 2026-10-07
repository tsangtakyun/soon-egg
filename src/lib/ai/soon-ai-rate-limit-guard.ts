export type SoonAiRateLimitDecision = {
  allowed: boolean;
  retry_after_seconds: number;
};

export type SoonAiRateLimitResult<T> =
  | { status: "allowed"; value: T }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "backend_unavailable"; error: unknown };

export async function runSoonAiRateLimitGuard<T>({
  check,
  onAllowed,
}: {
  check: () => Promise<SoonAiRateLimitDecision>;
  onAllowed: () => Promise<T>;
}): Promise<SoonAiRateLimitResult<T>> {
  let decision: SoonAiRateLimitDecision;
  try {
    decision = await check();
  } catch (error) {
    return { status: "backend_unavailable", error };
  }

  if (!decision.allowed) {
    return { status: "limited", retryAfterSeconds: decision.retry_after_seconds };
  }

  return { status: "allowed", value: await onAllowed() };
}
