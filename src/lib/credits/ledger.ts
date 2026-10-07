import "server-only";

import { getMasterSupabaseAdmin } from "@/lib/supabase-master";
import { createEggAdmin } from "@/lib/creator-workspace";
import {
  CREDIT_ACTIONS,
  CREDIT_POLICY_VERSION,
  type ChargeableCreditAction,
} from "@/lib/credits/policy";

// Separate from the legacy CREDIT_SYSTEM_ENABLED switch. Enabling this flag
// never activates checkout, subscriptions, or the old read-then-update wallet.
export const CREDIT_SYSTEM_ENABLED = process.env.EGG_CREDIT_V2_ENABLED === "true";

export class CreditReservationError extends Error {
  constructor(
    public readonly code: "idempotency_key_required" | "insufficient_credits" | "credit_backend_unavailable" | "credit_entitlement_unavailable" | "request_already_processed",
    public readonly status: number,
    public readonly balance?: number,
  ) {
    super(code);
  }
}

export type CreditReservation = {
  enabled: boolean;
  userId: string;
  requestId: string;
  action: ChargeableCreditAction;
  amount: number;
  balance: number | null;
};

function requestIdFrom(request: Request) {
  return request.headers.get("idempotency-key")?.trim().slice(0, 160) ?? "";
}

function freePeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01T00:00:00+08:00`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+08:00`,
  };
}

async function provisionWallet(input: { userId: string; email: string; workspaceId: string }) {
  const eggAdmin = createEggAdmin();
  const { data: profile, error: profileError } = await eggAdmin
    .from("egg_creator_profiles")
    .select("plan")
    .eq("id", input.workspaceId)
    .maybeSingle();
  if (profileError || !profile) throw new CreditReservationError("credit_entitlement_unavailable", 503);

  let plan: "free" | "creator";
  let allowance: 30 | 150;
  let period: { start: string; end: string };
  if (profile.plan === "free" || !profile.plan) {
    plan = "free";
    allowance = 30;
    period = freePeriod();
  } else if (profile.plan === "creator") {
    const { data: subscription, error } = await eggAdmin
      .from("egg_subscriptions")
      .select("current_period_start,current_period_end")
      .eq("user_id", input.userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !subscription?.current_period_start || !subscription.current_period_end) {
      throw new CreditReservationError("credit_entitlement_unavailable", 503);
    }
    plan = "creator";
    allowance = 150;
    period = { start: subscription.current_period_start, end: subscription.current_period_end };
  } else {
    throw new CreditReservationError("credit_entitlement_unavailable", 503);
  }

  const master = getMasterSupabaseAdmin();
  if (!master) throw new CreditReservationError("credit_backend_unavailable", 503);
  const { error } = await master.rpc("provision_egg_credit_wallet", {
    p_user_id: input.userId,
    p_email: input.email.trim().toLowerCase(),
    p_plan: plan,
    p_monthly_allowance: allowance,
    p_period_start: period.start,
    p_period_end: period.end,
  });
  if (error) throw new CreditReservationError("credit_backend_unavailable", 503);
}

export async function reserveCredits(input: {
  request: Request;
  userId: string;
  email: string;
  workspaceId: string;
  action: ChargeableCreditAction;
}): Promise<CreditReservation> {
  const amount = CREDIT_ACTIONS[input.action].credits;
  if (!CREDIT_SYSTEM_ENABLED) {
    return { enabled: false, userId: input.userId, requestId: "credits-disabled", action: input.action, amount, balance: null };
  }

  const requestId = requestIdFrom(input.request);
  if (!requestId) throw new CreditReservationError("idempotency_key_required", 400);
  await provisionWallet(input);
  const admin = getMasterSupabaseAdmin();
  if (!admin) throw new CreditReservationError("credit_backend_unavailable", 503);

  const { data, error } = await admin.rpc("reserve_egg_credits", {
    p_user_id: input.userId,
    p_email: input.email.trim().toLowerCase(),
    p_workspace_id: input.workspaceId,
    p_idempotency_key: requestId,
    p_action: input.action,
    p_amount: amount,
    p_policy_version: CREDIT_POLICY_VERSION,
  });
  const result = data?.[0] as { outcome?: string; balance?: number } | undefined;
  if (error || !result) throw new CreditReservationError("credit_backend_unavailable", 503);
  if (result.outcome === "insufficient") {
    throw new CreditReservationError("insufficient_credits", 402, Number(result.balance ?? 0));
  }
  if (result.outcome !== "reserved") {
    throw new CreditReservationError("request_already_processed", 409, Number(result.balance ?? 0));
  }
  return { enabled: true, userId: input.userId, requestId, action: input.action, amount, balance: Number(result.balance ?? 0) };
}

async function finalizeCredits(reservation: CreditReservation, operation: "commit_egg_credits" | "refund_egg_credits") {
  if (!reservation.enabled) return reservation.balance;
  const admin = getMasterSupabaseAdmin();
  if (!admin) throw new CreditReservationError("credit_backend_unavailable", 503);
  const { data, error } = await admin.rpc(operation, {
    p_user_id: reservation.userId,
    p_idempotency_key: reservation.requestId,
  });
  const result = data?.[0] as { outcome?: string; balance?: number } | undefined;
  if (error || !result || !["committed", "refunded", "already_committed", "already_refunded"].includes(result.outcome ?? "")) {
    throw new CreditReservationError("credit_backend_unavailable", 503);
  }
  return Number(result.balance ?? 0);
}

export function commitCredits(reservation: CreditReservation) {
  return finalizeCredits(reservation, "commit_egg_credits");
}

export function refundCredits(reservation: CreditReservation) {
  return finalizeCredits(reservation, "refund_egg_credits");
}

export function creditErrorResponse(error: unknown) {
  if (!(error instanceof CreditReservationError)) return null;
  return Response.json(
    { error: error.code, balance: error.balance ?? null },
    { status: error.status },
  );
}
