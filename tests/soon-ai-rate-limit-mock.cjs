const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/ai/soon-ai-rate-limit-guard.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleBox = { exports: {} };
Function("module", "exports", compiled)(moduleBox, moduleBox.exports);
const { runSoonAiRateLimitGuard } = moduleBox.exports;

(async () => {
  let providerCalls = 0;
  const limited = await runSoonAiRateLimitGuard({
    check: async () => ({ allowed: false, retry_after_seconds: 27 }),
    onAllowed: async () => { providerCalls += 1; },
  });
  assert.equal(limited.status, "limited");
  assert.equal(limited.retryAfterSeconds, 27);
  assert.equal(providerCalls, 0, "429 path must not call the paid provider");

  const backendFailure = await runSoonAiRateLimitGuard({
    check: async () => { throw new Error("mock backend unavailable"); },
    onAllowed: async () => { providerCalls += 1; },
  });
  assert.equal(backendFailure.status, "backend_unavailable");
  assert.equal(providerCalls, 0, "backend failure must fail closed before provider use");

  let permits = 5;
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => runSoonAiRateLimitGuard({
    check: async () => ({ allowed: permits-- > 0, retry_after_seconds: 60 }),
    onAllowed: async () => { providerCalls += 1; return "provider-result"; },
  })));
  assert.equal(concurrent.filter((result) => result.status === "allowed").length, 5);
  assert.equal(concurrent.filter((result) => result.status === "limited").length, 15);
  assert.equal(providerCalls, 5, "only allowed mock requests may reach the provider callback");

  console.log("SOON AI mock limiter: denied/backend paths call provider 0 times; concurrent allowance: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
