const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/soon-ai/chat/route.ts"),
  "utf8",
);

const auth = source.indexOf("getEggRequestContext(req)");
const guard = source.indexOf("runSoonAiRateLimitGuard({");
const limiter = source.indexOf("check: () => consumeSoonAiRateLimit({");
const allowedCallback = source.indexOf("onAllowed: async () => {");
const rejection = source.indexOf("status: 429");
const provider = source.indexOf("getAnthropic()");
const trackedCall = source.indexOf("trackedAnthropicCall({");

assert.ok(auth >= 0, "route must authenticate");
assert.ok(guard > auth, "route must use the shared rate-limit guard after authentication");
assert.ok(limiter > auth, "limiter must run after authentication");
assert.ok(allowedCallback > limiter, "paid work must be isolated in the allowed callback");
assert.ok(provider > allowedCallback, "provider lookup must occur inside the allowed callback");
assert.ok(trackedCall > provider, "paid provider call must remain behind the limiter");
assert.ok(rejection > provider, "limiter result must have an explicit 429 response branch");
assert.match(source, /Retry-After/);
assert.match(source, /status:\s*503/);

console.log("SOON AI auth/rate-limit/provider ordering: PASS");
