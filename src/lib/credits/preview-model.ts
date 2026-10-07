// Local specification simulator only. Never use as a server wallet or persist
// it as an entitlement. It has no database, provider, payment or network calls.
import { creditCost, type CreditAction } from "./policy";

type Operation = {
  actor: string; hash: string; amount: number; period: string;
  state: "reserved" | "committed" | "refunded";
  due: number | null; delivered: boolean; expiredReversal: number;
};
export type PreviewWallet = {
  workspace: string; period: string; balance: number; expiresAt: number;
  operations: Record<string, Operation>;
};
export function previewWallet(workspace: string, credits: number, now: number): PreviewWallet {
  if (!workspace || !Number.isSafeInteger(credits) || credits < 1 || !Number.isFinite(now)) throw new Error("invalid_preview");
  return { workspace, period: "trial", balance: credits, expiresAt: now + 7 * 86400000, operations: {} };
}
export function previewReserve(wallet: PreviewWallet, input: {
  workspace: string; actor: string; key: string; hash: string;
  action: CreditAction; now: number; verifiedDurationSeconds?: number;
}): PreviewWallet {
  if (input.workspace !== wallet.workspace) throw new Error("workspace_mismatch");
  if (!input.actor || !input.hash || !input.key || !Number.isFinite(input.now)) throw new Error("invalid_request");
  // Own-property checks: attacker-controlled keys cannot collide with prototypes.
  const existing = Object.hasOwn(wallet.operations, input.key) ? wallet.operations[input.key] : undefined;
  if (existing) {
    if (existing.actor !== input.actor || existing.hash !== input.hash) throw new Error("idempotency_conflict");
    return wallet;
  }
  if (input.now >= wallet.expiresAt) throw new Error("trial_expired");
  const amount = creditCost(input.action, input.verifiedDurationSeconds);
  if (amount === null) throw new Error("verified_cost_required");
  if (wallet.balance < amount) throw new Error("insufficient_credits");
  return { ...wallet, balance: wallet.balance - amount, operations: {
    ...wallet.operations, [input.key]: { actor: input.actor, hash: input.hash, amount,
      period: wallet.period, state: "reserved", due: null, delivered: false, expiredReversal: 0 },
  } };
}
export function previewUnknown(wallet: PreviewWallet, key: string, now: number): PreviewWallet {
  const op = Object.hasOwn(wallet.operations, key) ? wallet.operations[key] : undefined;
  if (!op || op.state !== "reserved" || op.due !== null) return wallet;
  return { ...wallet, operations: { ...wallet.operations, [key]: { ...op, due: now + 15 * 60000 } } };
}
export function previewSettle(wallet: PreviewWallet, key: string, now: number, outcome: "success" | "failed" | "timer"): PreviewWallet {
  const op = Object.hasOwn(wallet.operations, key) ? wallet.operations[key] : undefined;
  if (!op || !Number.isFinite(now)) throw new Error("invalid_operation");
  if (op.state === "committed") return wallet;
  const refund = op.state === "reserved" && (outcome === "failed" || (op.due !== null && now >= op.due));
  const restored = refund && op.period === wallet.period && now < wallet.expiresAt ? op.amount : 0;
  const state = refund || op.state === "refunded" ? "refunded" : outcome === "success" ? "committed" : "reserved";
  return { ...wallet, balance: wallet.balance + restored, operations: { ...wallet.operations, [key]: {
    ...op, state, delivered: op.delivered || outcome === "success",
    expiredReversal: refund ? op.amount - restored : op.expiredReversal,
  } } };
}
