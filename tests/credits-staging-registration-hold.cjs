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
  assert.equal(load({ VERCEL_GIT_COMMIT_REF: branch }).pageExtensions, undefined);
}
const valid = { VERCEL_GIT_COMMIT_REF: "codex/credits-wallet-staging", VERCEL_ENV: "preview",
  EGG_CREDIT_STAGING_ENABLED: "true", NEXT_PUBLIC_SUPABASE_URL: "https://netzschelivdhfkznfrq.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-test-placeholder", SUPABASE_SERVICE_ROLE_KEY: "server-test-placeholder" };
assert.deepEqual(Array.from(load(valid).pageExtensions), ["staging.tsx", "staging.ts"]);
for (const key of ["VERCEL_ENV", "EGG_CREDIT_STAGING_ENABLED", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  assert.throws(() => load({ ...valid, [key]: undefined }), /EGG_STAGING_REGISTRATION_HOLD/);
}
assert.throws(() => load({ ...valid, VERCEL_ENV: "production" }), /EGG_STAGING_REGISTRATION_HOLD/);
assert.throws(() => load({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "https://ycqribpphvywibamtjew.supabase.co" }), /EGG_STAGING_REGISTRATION_HOLD/);
console.log("PASS: incomplete/prod config blocked; ready Preview compiles staging entries only; other branches unchanged");
