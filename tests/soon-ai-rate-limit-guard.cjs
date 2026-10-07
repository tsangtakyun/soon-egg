const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/soon-ai/chat/route.ts"),
  "utf8",
);

const auth = source.indexOf("getEggRequestContext(req)");
const limiter = source.indexOf("consumeSoonAiRateLimit({");
const rejection = source.indexOf("status: 429");
const provider = source.indexOf("getAnthropic()");
const trackedCall = source.indexOf("trackedAnthropicCall({");

assert.ok(auth >= 0, "route must authenticate");
assert.ok(limiter > auth, "limiter must run after authentication");
assert.ok(rejection > limiter, "limiter must have an explicit 429 branch");
assert.ok(provider > rejection, "provider lookup must occur after the 429 branch");
assert.ok(trackedCall > provider, "paid provider call must remain behind the limiter");
assert.match(source, /Retry-After/);
assert.match(source, /status:\s*503/);

console.log("SOON AI auth/rate-limit/provider ordering: PASS");
