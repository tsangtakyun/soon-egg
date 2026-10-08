import "server-only";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createStagingWallet, stagingWalletEnabled } from "./staging-runtime";

export const LAB_COOKIE = "egg_credit_lab_workspace";
export class LabError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function requireLab() {
  if (!stagingWalletEnabled() || (process.env.VERCEL_ENV && process.env.VERCEL_GIT_COMMIT_REF !== "codex/credits-wallet-staging")) {
    throw new LabError("staging_disabled", 503);
  }
}
export function labAdmin() {
  requireLab();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new LabError("staging_connection_unavailable", 503);
  // URL was matched exactly by requireLab. No Master/production fallback.
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function labSession(request: Request) {
  requireLab();
  const header = request.headers.get("authorization");
  const bearer = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (header !== null && !bearer) throw new LabError("authentication_required", 401);
  const auth = bearer ? labAdmin() : await createClient();
  if (!auth) throw new LabError("staging_connection_unavailable", 503);
  const { data: { user }, error } = await auth.auth.getUser(bearer);
  if (error || !user) throw new LabError("authentication_required", 401);
  const admin = labAdmin();
  const { data: members, error: memberError } = await admin.from("egg_creator_workspace_members")
    .select("workspace_id,role").eq("user_id", user.id).order("workspace_id").limit(100);
  if (memberError) throw new LabError("membership_backend_unavailable", 503);
  return { user, admin, members: members ?? [], bearer };
}
export async function labContext(request: Request) {
  const session = await labSession(request);
  const selected = session.bearer ? request.headers.get("x-egg-workspace-id") : (await cookies()).get(LAB_COOKIE)?.value;
  if (selected && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(selected)) throw new LabError("invalid_workspace", 400);
  if (!selected && session.members.length > 1) throw new LabError("workspace_selection_required", 409);
  const member = selected ? session.members.find(m => m.workspace_id === selected) : session.members[0];
  if (!member || !["owner", "admin", "member"].includes(member.role)) throw new LabError("workspace_access_denied", 403);
  return { ...session, workspaceId: member.workspace_id as string, role: member.role as string };
}
export async function labStatus(context: Awaited<ReturnType<typeof labContext>>) {
  const { admin, workspaceId } = context;
  const [period, operations, results] = await Promise.all([
    admin.from("egg_credit_periods_v2").select("available,allowance,period_end").eq("workspace_id", workspaceId).eq("period_key", "trial").maybeSingle(),
    admin.from("egg_credit_operations_v2").select("call_id,actor_user_id,action,amount,credit_status,provider_status,refund_due_at,result_saved_at,created_at")
      .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(30),
    admin.from("egg_credit_mock_results_v2").select("call_id,payload,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(30),
  ]);
  if (period.error || operations.error || results.error) throw new LabError("status_backend_unavailable", 503);
  return { workspaceId, role: context.role, period: period.data, operations: operations.data, results: results.data, testOnly: true };
}
export async function labRun(context: Awaited<ReturnType<typeof labContext>>, input: { key: string; prompt: string; scenario: "success" | "failure" | "unknown" }) {
  const wallet = createStagingWallet(context.admin, { workspaceId: context.workspaceId, userId: context.user.id });
  const reservation = await wallet.reserve({ key: input.key, action: "egg_this_generate", canonicalPayload: JSON.stringify({ prompt: input.prompt, scenario: input.scenario }) });
  const callId = String(reservation.callId);
  // A replay is never another provider dispatch. Saved state comes from GET.
  if (reservation.reused) return { callId, reused: true, testOnly: true };
  const claim = await wallet.claim(callId);
  if (!claim.claimed) return { callId, pending: true, testOnly: true };
  const token = String(claim.claim);
  if (input.scenario === "failure" || input.scenario === "unknown") {
    await wallet.settle(callId, input.scenario === "failure" ? "failed" : "unknown", token);
    return { callId, scenario: input.scenario, testOnly: true };
  }
  const { error } = await context.admin.rpc("egg_credit_save_mock_result_v2", { p_call: callId, p_claim: token });
  if (error) {
    // Ambiguous transport outcome is not a proven failure: don't redispatch/refund twice.
    await wallet.settle(callId, "unknown", token);
    throw new LabError("mock_save_pending", 503);
  }
  return { callId, saved: true, testOnly: true };
}
export async function labLate(context: Awaited<ReturnType<typeof labContext>>, callId: string) {
  const { data, error } = await context.admin.from("egg_credit_operations_v2").select("dispatch_claim,credit_status,provider_status")
    .eq("workspace_id", context.workspaceId).eq("actor_user_id", context.user.id).eq("call_id", callId).maybeSingle();
  if (error) throw new LabError("operation_backend_unavailable", 503);
  if (!data?.dispatch_claim) throw new LabError("operation_access_denied", 403);
  if (!["unknown", "succeeded"].includes(data.provider_status)) throw new LabError("late_result_not_applicable", 409);
  const { error: saveError } = await context.admin.rpc("egg_credit_save_mock_result_v2", { p_call: callId, p_claim: data.dispatch_claim });
  if (saveError) throw new LabError("mock_save_pending", 503);
  return { saved: true, testOnly: true };
}
