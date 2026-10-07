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
assert.equal(policy.CREDIT_ENTITLEMENTS.creator.monthlyCredits, 150);
assert.equal(policy.CREDIT_ENTITLEMENTS.creator.reset, "subscription_billing_cycle");
assert.equal(policy.creditCost("soon_ai_chat"), 1);
assert.equal(policy.creditCost("script_generate"), 3);
assert.equal(policy.creditCost("egg_this_generate"), 5);
assert.equal(policy.creditCost("reply_generate"), null);
assert.equal(policy.creditCost("subtitle_transcribe"), null);
assert.equal(policy.resolveCreditAction("ai_generate", "soon_ai"), "soon_ai_chat");
assert.equal(policy.resolveCreditAction("ai_generate", "script"), "script_generate");
assert.equal(policy.resolveCreditAction("ai_generate", "egg_this"), "egg_this_generate");
assert.equal(policy.resolveCreditAction("ai_generate"), null);
assert.equal(policy.resolveCreditAction("unknown"), null);

const ledger = fs.readFileSync(path.join(process.cwd(), "docs/migrations/20261007121000_master_credit_wallets.sql"), "utf8");
assert.match(ledger, /unique \(user_id, idempotency_key\)/i);
assert.match(ledger, /for update/i);
assert.match(ledger, /status='refunded'/i);
assert.match(ledger, /included_balance\+v_row\.included_amount/i);

console.log("credits policy and atomic ledger contract: PASS");
