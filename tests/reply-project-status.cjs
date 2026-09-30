const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, process: { env: {} }, Date, Set, JSON });
  return exports;
}
const policy = load('src/lib/reply-project-status.ts');
async function scenario(surface, status, options = {}) {
  const writes = [];
  class Query {
    constructor(table) { this.table = table; this.filters = []; }
    select() { return this; } limit() { return this; } maybeSingle() { return this; }
    eq(k,v) { this.filters.push([k,v]); return this; }
    update(value) { this.value = value; writes.push(this); return this; }
    then(resolve) {
      if (this.table === 'egg_creator_workspace_members') return Promise.resolve({ data: { workspace_id: 'workspace-a', role: 'owner' } }).then(resolve);
      if (this.table === 'egg_creator_profiles') return Promise.resolve({ data: { id: 'workspace-a' } }).then(resolve);
      assert.equal(this.table, 'egg_reply_projects');
      assert.ok(this.filters.some(([k,v]) => k === 'creator_id' && v === 'workspace-a'));
      assert.ok(this.filters.some(([k,v]) => k === 'id' && v === 'project-a'));
      assert.deepEqual(Object.keys(this.value).sort(), ['lifecycle_status', 'status_updated_at']);
      return Promise.resolve({ data: options.missing ? null : { id: 'project-a', ...this.value }, error: options.failure ? { message: 'offline' } : null }).then(resolve);
    }
  }
  const admin = { from: table => new Query(table), auth: { getUser: async () => ({ data: { user: options.unauthorized ? null : { id: 'user-a' } } }) } };
  const route = load(`src/app/api/${surface === 'web' ? 'tools/reply/projects' : 'mobile/reply'}/route.ts`, {
    'next/server': { after: () => { throw Error('Status must not generate AI'); }, NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } },
    '@/lib/reply-project-status': policy,
    '@/lib/supabase/server': { createClient: async () => admin },
    '@/lib/creator-workspace': { createEggAdmin: () => admin, getActiveCreatorProfile: async () => ({ profile: { id: 'workspace-a' } }), acceptPendingWorkspaceInvitations: async () => {} },
    '@/lib/reply-attachments': {}, '@/lib/reply-workspace-rules': {}, '@/lib/reply-language': {}, '@/lib/ai/anthropic': {},
  });
  const request = { headers: { get: key => key === 'authorization' ? 'Bearer test' : 'workspace-a' }, json: async () => ({ action: 'set_project_status', projectId: 'project-a', lifecycle_status: status, notes: 'must not overwrite' }) };
  return { result: await (surface === 'web' ? route.PATCH : route.POST)(request), writes };
}
(async () => {
  for (const surface of ['web', 'mobile']) {
    for (const status of policy.replyProjectStatuses) assert.equal((await scenario(surface, status)).result.status, 200);
    for (const invalid of ['accepted', '', null, { status: 'confirmed' }]) {
      const r = await scenario(surface, invalid); assert.equal(r.result.status,400); assert.equal(r.writes.length,0);
    }
    const denied = await scenario(surface, 'confirmed', { unauthorized: true }); assert.equal(denied.result.status,401); assert.equal(denied.writes.length,0);
    assert.equal((await scenario(surface, 'confirmed', { missing: true })).result.status,404);
    assert.equal((await scenario(surface, 'confirmed', { failure: true })).result.status,500);
  }
  console.log('PASS: web/mobile lifecycle transitions, authentication, workspace scoping, invalid status rejection, missing/error handling; no summary/message/interaction timestamp writes or AI jobs.');
})();
