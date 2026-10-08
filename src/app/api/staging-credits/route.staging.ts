import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createStagingWallet, StagingCreditError } from "@/lib/credits/staging-runtime";
import { LAB_COOKIE, LabError, requireLab, labAdmin, labSession, labContext, labStatus, labRun, labLate } from "@/lib/credits/lab";

export const dynamic = "force-dynamic";
function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function failure(error: unknown) {
  if (error instanceof LabError) return reply({ error: error.code }, error.status);
  if (error instanceof StagingCreditError && ["owner_required", "trial_not_eligible", "workspace_access_denied", "idempotency_conflict", "insufficient_credits", "wallet_not_started", "credit_entitlement_expired"].includes(error.code)) {
    return reply({ error: error.code }, error.code === "workspace_access_denied" || error.code === "owner_required" ? 403 : 409);
  }
  return reply({ error: "staging_backend_unavailable" }, 503);
}
export async function GET(request: Request) {
  try {
    requireLab();
    if (new URL(request.url).searchParams.get("preflight") === "1") {
      const [{ error }, authSettings] = await Promise.all([
        labAdmin().from("egg_creator_workspace_members").select("workspace_id")
          .eq("user_id", "00000000-0000-0000-0000-000000000000").limit(1),
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" }, cache: "no-store",
        }),
      ]);
      if (error || !authSettings.ok) throw new LabError("staging_connection_unavailable", 503);
      return reply({ testOnly: true, provider: "mock_only", database: "netzschelivdhfkznfrq", reachable: true });
    }
    const session = await labSession(request);
    let status = null;
    try { status = await labStatus(await labContext(request)); }
    catch (error) {
      if (!(error instanceof LabError) || !["workspace_selection_required", "workspace_access_denied"].includes(error.code)) throw error;
    }
    return reply({ userId: session.user.id, members: session.members, status, testOnly: true });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireLab();
    const bearer = request.headers.get("authorization")?.match(/^Bearer\s+\S+$/i);
    if (!bearer && request.headers.get("origin") !== new URL(request.url).origin) throw new LabError("invalid_origin", 403);
    if (Number(request.headers.get("content-length") ?? 0) > 8192) throw new LabError("request_too_large", 413);
    const text = await request.text();
    if (text.length > 8192) throw new LabError("request_too_large", 413);
    let body;
    try { body = JSON.parse(text); } catch { throw new LabError("invalid_request"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new LabError("invalid_request");
    if (body.action === "login") {
      if (bearer || request.headers.get("origin") !== new URL(request.url).origin) throw new LabError("invalid_origin", 403);
      if (typeof body.email !== "string" || body.email.length > 254 || typeof body.password !== "string" || body.password.length > 512) throw new LabError("invalid_login");
      const auth = await createClient();
      if (!auth) throw new LabError("staging_connection_unavailable", 503);
      const { error } = await auth.auth.signInWithPassword({ email: body.email, password: body.password });
      if (error) throw new LabError("login_failed", 401);
      (await cookies()).delete(LAB_COOKIE);
      return reply({ signedIn: true }); // never send session tokens/passwords to JSON/logs
    }
    const session = await labSession(request);
    if (body.action === "logout") {
      if (bearer) throw new LabError("cookie_session_required");
      const auth = await createClient();
      const result = await auth?.auth.signOut({ scope: "local" });
      if (result?.error) throw new LabError("logout_failed", 503);
      (await cookies()).delete(LAB_COOKIE);
      return reply({ signedOut: true });
    }
    if (body.action === "select") {
      if (bearer || !session.members.some(m => m.workspace_id === body.workspaceId)) throw new LabError("workspace_access_denied", 403);
      (await cookies()).set(LAB_COOKIE, body.workspaceId, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/" });
      return reply({ selected: true });
    }
    const context = await labContext(request);
    if (body.action === "start") {
      return reply(await createStagingWallet(context.admin, { workspaceId: context.workspaceId, userId: context.user.id }).start());
    }
    if (body.action === "run") {
      if (typeof body.key !== "string" || !body.key || body.key.length > 200 || typeof body.prompt !== "string" || body.prompt.length > 2000 || !["success", "failure", "unknown"].includes(body.scenario)) throw new LabError("invalid_operation");
      return reply(await labRun(context, { key: body.key, prompt: body.prompt, scenario: body.scenario }));
    }
    if (body.action === "late") {
      if (typeof body.callId !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.callId)) throw new LabError("invalid_operation");
      return reply(await labLate(context, body.callId));
    }
    throw new LabError("unsupported_action");
  } catch (error) { return failure(error); }
}
