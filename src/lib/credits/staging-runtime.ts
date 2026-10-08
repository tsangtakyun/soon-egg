import "server-only";
import { createHash } from "node:crypto";
import { creditCost, type CreditAction } from "@/lib/credits/policy";

export const EGG_CREDIT_STAGING_REF = "netzschelivdhfkznfrq";
type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }> };
export type CreditActor = { workspaceId: string; userId: string };
type Json = Record<string, unknown>;

export function stagingWalletEnabled(env: Record<string, string | undefined> = process.env) {
  return env.EGG_CREDIT_STAGING_ENABLED === "true"
    && (env.VERCEL_ENV === "preview" || (!env.VERCEL_ENV && ["test", "development"].includes(env.NODE_ENV ?? "")))
    && env.NEXT_PUBLIC_SUPABASE_URL === `https://${EGG_CREDIT_STAGING_REF}.supabase.co`;
}

export class StagingCreditError extends Error {
  constructor(public readonly code: string) { super(code); }
}
// Routes create this actor from a verified credit/Lab membership context,
// never request JSON or the legacy auto-creating product context.
// This adapter does not activate existing provider routes or bypass their gates.
export function createStagingWallet(client: RpcClient, actor: CreditActor) {
  async function rpc(name: string, args: Record<string, unknown>): Promise<Json> {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new StagingCreditError(error.message);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new StagingCreditError("invalid_wallet_response");
    return data as Json;
  }
  return {
    start: () => rpc("egg_trial_start_v2", { p_workspace: actor.workspaceId, p_actor: actor.userId }),
    async reserve(input: { key: string; action: CreditAction; canonicalPayload: string;
      // Produced by a server-side immutable-media verifier, never client seconds.
      verifiedMedia?: { seconds: number; sha256: string; source: "server_probe" | "trusted_provider_metadata" } }) {
      if (!input.key || input.key.length > 200) throw new StagingCreditError("idempotency_key_required");
      const cost = creditCost(input.action, input.verifiedMedia?.seconds);
      if (cost === null) throw new StagingCreditError("unpriced_action_or_unverified_media");
      if (input.action !== "subtitle_generate" && input.verifiedMedia) throw new StagingCreditError("unexpected_media_metadata");
      const identity = JSON.stringify({ action: input.action, payload: input.canonicalPayload, media: input.verifiedMedia ?? null });
      const hash = createHash("sha256").update(identity).digest("hex");
      return rpc("egg_credit_reserve_v2", { p_workspace: actor.workspaceId, p_actor: actor.userId,
        p_key: input.key, p_hash: hash, p_action: input.action,
        p_media_seconds: input.verifiedMedia?.seconds ?? null, p_media_sha256: input.verifiedMedia?.sha256 ?? null,
        p_duration_source: input.verifiedMedia?.source ?? null });
    },
    claim: (callId: string) => rpc("egg_credit_claim_v2", { p_call: callId, p_actor: actor.userId }),
    settle: (callId: string, event: "unknown" | "failed" | "cancelled" | "succeeded" | "refund_due", claim?: string, result?: string) =>
      rpc("egg_credit_settle_v2", { p_call: callId, p_event: event, p_claim: claim ?? null, p_result: result ?? null }),
  };
}

// Provider and durable save are an injected server callback. No SDK is constructed
// here. A transport timeout/crash is ambiguous and must not cause redispatch.
export async function executeStagingCreditOperation(
  wallet: ReturnType<typeof createStagingWallet>,
  input: Parameters<ReturnType<typeof createStagingWallet>["reserve"]>[0],
  generateAndSave: (callId: string) => Promise<{ resultReference: string }>,
) {
  const reservation = await wallet.reserve(input);
  const callId = String(reservation.callId);
  if (reservation.reused) return { callId, state: "existing" as const };
  const claim = await wallet.claim(callId);
  if (!claim.claimed) return { callId, state: "pending" as const };
  try {
    const result = await generateAndSave(callId);
    if (!result.resultReference) throw new StagingCreditError("result_save_failed");
    const settlement = await wallet.settle(callId, "succeeded", String(claim.claim), result.resultReference);
    return { callId, state: "saved" as const, settlement };
  } catch (error) {
    // Only a positively identified save failure is an immediate reversal.
    const event = error instanceof StagingCreditError && error.code === "result_save_failed" ? "failed" : "unknown";
    await wallet.settle(callId, event, String(claim.claim));
    return { callId, state: event === "failed" ? "refunded" as const : "pending" as const };
  }
}
