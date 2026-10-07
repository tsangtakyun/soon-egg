const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = {}) {
  const box = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  Function('module','exports','require',code)(box,box.exports,name => { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; });
  return box.exports;
}
const gate = load('src/lib/credits/preview-admission.ts');
assert.equal(gate.isTrialPreviewBlocked({EGG_TRIAL_PREVIEW:'true',VERCEL_ENV:'production'}),false);
assert.equal(gate.isTrialPreviewBlocked({EGG_TRIAL_PREVIEW:'true',VERCEL_ENV:'preview'}),true);
assert.equal(gate.isTrialPreviewBlocked({VERCEL_ENV:'preview'}),false);
assert.equal(gate.isTrialPreviewBlocked({EGG_TRIAL_PREVIEW:'true',NODE_ENV:'test'}),true);
let sdkConstructed = 0;
const providerFactory = load('src/lib/ai/anthropic.ts', {
  '@anthropic-ai/sdk': { default: class { constructor() { sdkConstructed++; } } },
  '@/lib/credits/preview-admission': { isTrialPreviewBlocked: () => true },
});
assert.equal(providerFactory.getAnthropic(),null);
assert.equal(sdkConstructed,0,'blocked Preview must not initialize the paid SDK');
const routes = [
  'soon-ai/chat','tools/script/generate','egg/projects','egg/projects/[id]/generate',
  'egg/projects/[id]/styles','egg/command','egg/daily','egg/dna-rules/suggest',
  'tools/docs/enhance','media-kit/generate','brands/match','brands/pitch',
  'profile/bio-suggestions','onboarding/analyze','tools/reply/chat','mobile/reply',
  'mobile/reply/draft','mobile/reply/transcribe','tools/subtitle/generate',
  'mobile/topics','topics','cron/topic-geography',
];
for (const route of routes) assert.match(fs.readFileSync(`src/app/api/${route}/route.ts`,'utf8'),/trialPreviewAdmissionResponse\(\)/,route);
// Static coverage check, not a claim that every route has a live runtime test.
assert.match(fs.readFileSync('src/lib/subtitle-service.ts','utf8'),/trialPreviewAdmissionResponse\(\)/);
for (const file of ['src/app/api/topics/route.ts','src/app/api/mobile/topics/route.ts']) {
  assert.match(fs.readFileSync(file,'utf8'),/async function resolveSharedTopicMetadata\(sourceUrl: string\) \{\s+if \(isTrialPreviewBlocked\(\)\)/);
}
let authenticated = false, providerCalls = 0, limiterCalls = 0;
const route = load('src/app/api/soon-ai/chat/route.ts', {
  '@/lib/ai/anthropic': { getAnthropic: () => { providerCalls++; throw Error('Provider reached'); } },
  '@/lib/credits/preview-admission': { trialPreviewAdmissionResponse: () => Response.json({error:'workspace_wallet_not_configured'},{status:503}) },
  '@/lib/ai/soon-ai-rate-limit-guard': { runSoonAiRateLimitGuard: () => { limiterCalls++; throw Error('Limiter reached'); } },
  '@/lib/ai/usage-ledger': {},
  '@/lib/egg-api-context': { getEggRequestContext: async () => authenticated ? {user:{id:'u',email:'u@example.test'},workspaceId:'w'} : null },
  '@/lib/credits/ledger': {},
  'next/server': { NextResponse: Response },
});
(async () => {
  const request = new Request('https://example.test/api/soon-ai/chat',{method:'POST'});
  assert.equal((await route.POST(request)).status,401);
  authenticated = true;
  const result = await route.POST(request);
  assert.equal(result.status,503);
  assert.equal((await result.json()).error,'workspace_wallet_not_configured');
  assert.equal(providerCalls,0);
  assert.equal(limiterCalls,0);
  console.log('Preview admission route unit test: 401 / authenticated 503; provider calls 0. Not a live deployment test.');
})().catch(error => { console.error(error); process.exitCode=1; });
