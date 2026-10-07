import "server-only";
import { CREDIT_ACTIONS, type ChargeableCreditAction } from "@/lib/credits/policy";

// This switch requires admission, not activation of the superseded user wallet.
export const CREDIT_SYSTEM_ENABLED = process.env.EGG_CREDIT_V2_ENABLED === "true";

export class CreditReservationError extends Error {
  constructor(
    public readonly code: "idempotency_key_required" | "insufficient_credits" | "credit_backend_unavailable" | "credit_entitlement_unavailable" | "request_already_processed",
    public readonly status: number,
    public readonly balance?: number,
  ) { super(code); }
}

export type CreditReservation = {
  enabled: boolean; userId: string; requestId: string; action: ChargeableCreditAction;
  amount: number; balance: number | null;
};

export async function reserveCredits(input: {
  request: Request; userId: string; email: string; workspaceId: string; action: ChargeableCreditAction;
}): Promise<CreditReservation> {
  // No approved workspace store yet. Never fall back to Master/user-scoped RPCs
  // or silently grant a trial from client-supplied metadata.
  if (CREDIT_SYSTEM_ENABLED) throw new CreditReservationError("credit_backend_unavailable", 503);
  return { enabled: false, userId: input.userId, requestId: "credits-disabled", action: input.action, amount: CREDIT_ACTIONS[input.action].credits, balance: null };
}

async function finalizeCredits(reservation: CreditReservation) {
  if (reservation.enabled) throw new CreditReservationError("credit_backend_unavailable", 503);
  return reservation.balance;
}
export function commitCredits(reservation: CreditReservation) { return finalizeCredits(reservation); }
export function refundCredits(reservation: CreditReservation) { return finalizeCredits(reservation); }

export function creditErrorResponse(error: unknown) {
  if (!(error instanceof CreditReservationError)) return null;
  return Response.json({ error: error.code, balance: error.balance ?? null }, { status: error.status });
}
