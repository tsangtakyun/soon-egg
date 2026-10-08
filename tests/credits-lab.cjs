const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, imports) {
  const box = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  Function("module", "exports", "require", code)(box, box.exports, name => {
    if (!(name in imports)) throw Error("Unexpected import " + name);
    return imports[name];
  });
  return box.exports;
}
async function main() {
  let reserved = 0, claimed = 0, saved = 0, settled = [], reused = false;
  const runtime = { stagingWalletEnabled: () => true, createStagingWallet: (_admin, actor) => {
    assert.deepEqual(actor, { workspaceId: "verified-workspace", userId: "verified-user" });
    return { reserve: async input => { reserved++; assert.equal(input.action, "egg_this_generate"); return { callId: "logical-call", reused }; },
      claim: async () => { claimed++; return { claimed: true, claim: "private-claim" }; },
      settle: async (_call, event, claim) => { assert.equal(claim, "private-claim"); settled.push(event); } };
  } };
  const lab = load("src/lib/credits/lab.ts", { "server-only": {}, "next/headers": { cookies: async () => ({}) },
    "@supabase/supabase-js": {}, "@/lib/supabase/server": {}, "./staging-runtime": runtime });
  const context = { workspaceId: "verified-workspace", user: { id: "verified-user" }, admin: { rpc: async (name, args) => {
    assert.equal(name, "egg_credit_save_mock_result_v2"); assert.deepEqual(args, { p_call: "logical-call", p_claim: "private-claim" }); saved++; return { error: null };
  } } };
  const input = { key: "key", prompt: "prompt", scenario: "success" };
  const result = await lab.labRun(context, input);
  assert.equal(result.saved, true); assert.equal(result.testOnly, true); assert.equal(saved, 1);
  assert.equal(JSON.stringify(result).includes("private-claim"), false);
  reused = true; await lab.labRun(context, input); assert.equal(claimed, 1); assert.equal(saved, 1);
  reused = false; await lab.labRun(context, { ...input, scenario: "failure" });
  await lab.labRun(context, { ...input, scenario: "unknown" });
  assert.deepEqual(settled, ["failed", "unknown"]); assert.equal(saved, 1); assert.equal(reserved, 4);
  let sessions = 0, runs = 0;
  const route = load("src/app/api/staging-credits/route.staging.ts", {
    "next/headers": { cookies: async () => ({ delete() {}, set() {} }) }, "@/lib/supabase/server": {},
    "@/lib/credits/staging-runtime": { StagingCreditError: class extends Error {}, createStagingWallet: runtime.createStagingWallet },
    "@/lib/credits/lab": { ...lab, requireLab() {}, labSession: async () => { sessions++; return { members: [] }; },
      labContext: async () => context, labRun: async (ctx, operation) => { assert.equal(ctx, context); assert.equal(operation.prompt, "safe"); runs++; return { testOnly: true }; } },
  });
  function request(body, origin = "https://preview.example") { return new Request("https://preview.example/api/staging-credits", { method: "POST", headers: { origin }, body: JSON.stringify(body) }); }
  assert.equal((await route.POST(request({ action: "run" }, "https://attacker.example"))).status, 403); assert.equal(sessions, 0);
  assert.equal((await route.POST(request({ action: "run", key: "x", prompt: "safe", scenario: "paid_provider" }))).status, 400); assert.equal(runs, 0);
  assert.equal((await route.POST(request({ action: "select", workspaceId: "other" }))).status, 403);
  assert.equal((await route.POST(request({ action: "run", key: "x", prompt: "safe", scenario: "success", userId: "attacker", workspaceId: "other", amount: -99 }))).status, 200); assert.equal(runs, 1);
  console.log("PASS Lab mocked boundaries: atomic mock RPC, replay no redispatch, failure/unknown, no claim leak, CSRF, scenario validation, member-only selection, spoof fields ignored. Not live Auth/concurrency evidence.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
