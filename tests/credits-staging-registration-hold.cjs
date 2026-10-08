const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("next.config.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function load(env) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env } });
  return exports.default;
}
for (const env of [
  { VERCEL_GIT_COMMIT_REF: "codex/credits-wallet-staging" },
  { VERCEL_GIT_COMMIT_REF: "codex/credits-wallet-staging", VERCEL_ENV: "preview" },
  { VERCEL_GIT_COMMIT_REF: "codex/credits-wallet-staging", EGG_CREDIT_STAGING_ENABLED: "true" },
  { VERCEL_GIT_COMMIT_REF: "codex/credits-wallet-staging", VERCEL_ENV: "production" },
]) {
  assert.throws(() => load(env), /EGG_STAGING_REGISTRATION_HOLD/);
}
for (const branch of [undefined, "main", "codex/credits-preview", "another-branch"]) {
  assert.equal(typeof load({ VERCEL_GIT_COMMIT_REF: branch }).headers, "function");
}
console.log("PASS: staging branch blocked in all tested environments; other branches unchanged");
