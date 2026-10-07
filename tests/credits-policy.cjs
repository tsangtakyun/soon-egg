const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const policyPath = path.join(process.cwd(), "src/lib/credits/policy.ts");
const source = fs.readFileSync(policyPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleBox = { exports: {} };
Function("module", "exports", compiled)(moduleBox, moduleBox.exports);
const policy = moduleBox.exports;

assert.equal(policy.CREDIT_ENTITLEMENTS.free.monthlyCredits, 30);
assert.equal(policy.CREDIT_ENTITLEMENTS.free.reset, "calendar_month");
assert.equal(policy.CREDIT_ENTITLEMENTS.free.timezone, "Asia/Hong_Kong");
assert.equal(policy.CREDIT_ENTITLEMENTS.free.timezoneConfirmed, true);
assert.equal(policy.CREDIT_ENTITLEMENTS.free.rollover, false);
assert.equal(policy.CREDIT_ENTITLEMENTS.creator.monthlyCredits, 150);
assert.equal(policy.CREDIT_ENTITLEMENTS.creator.priceHkdMonthly, 98);
assert.equal(policy.CREDIT_ENTITLEMENTS.creator.rollover, false);
assert.equal(policy.CREDIT_ENTITLEMENTS.creator.reset, "subscription_billing_cycle");
assert.equal(policy.creditCost("soon_ai_chat"), 1);
assert.equal(policy.creditCost("script_generate"), 3);
assert.equal(policy.creditCost("egg_this_generate"), 5);
assert.equal(policy.creditCost("reply_generate"), null);
assert.equal(policy.creditCost("subtitle_transcribe"), null);
assert.equal(policy.creditCost("reply_short"), 1);
assert.equal(policy.creditCost("reply_full"), 3);
assert.equal(policy.creditCost("reply_image"), 5);
for (const [duration, expected] of [[0.1,3],[59.999,3],[60,3],[60.001,6],[120,6],[120.001,9]]) {
  assert.equal(policy.creditCost("subtitle_generate", duration), expected);
}
for (const duration of [undefined,0,-1,NaN,Infinity]) assert.equal(policy.creditCost("subtitle_generate", duration), null);
assert.equal(policy.CREDIT_WALLET_READY, false);
assert.equal(policy.trialPreviewPolicy().credits, 30);
assert.equal(policy.trialPreviewPolicy("12").credits, 12);
for (const bad of ["0","151","1.5","invalid"]) assert.equal(policy.trialPreviewPolicy(bad).credits,30);
assert.equal(policy.trialPreviewPolicy().activated, false);
assert.equal(policy.resolveCreditAction("ai_generate", "soon_ai"), "soon_ai_chat");
assert.equal(policy.resolveCreditAction("ai_generate", "script"), "script_generate");
assert.equal(policy.resolveCreditAction("ai_generate", "egg_this"), "egg_this_generate");
assert.equal(policy.resolveCreditAction("ai_generate"), null);
assert.equal(policy.resolveCreditAction("unknown"), null);

// Static proposal checks only: these do not execute SQL or prove atomicity.
const ledger = fs.readFileSync(path.join(process.cwd(), "docs/migrations/20261007180000_egg_workspace_wallet_proposal.sql"), "utf8");
assert.match(ledger, /unique \(workspace_id, idempotency_key\)/i);
assert.match(ledger, /PRIMARY KEY \(workspace_id, period_key\)/i);
assert.match(ledger, /payer_user_id/i);
assert.match(ledger, /'subtitle_generate'/i);
assert.match(ledger, /refund_restored \+ refund_expired = amount/i);
assert.match(ledger, /'unknown'/i);
assert.match(ledger, /ENABLE ROW LEVEL SECURITY/i);

console.log("credits policy and static wallet proposal checks: PASS (SQL not executed)");
