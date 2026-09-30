const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, process: { env: {} }, Intl, Date, Set, Map, JSON });
  return exports;
}
const policy = load('src/lib/command-policy.ts');
const topic = (id, title, tags) => ({ id, title, tags, summary: '來源中的題材內容', category: '旅遊', source_name: '測試來源', source_url: 'https://example.com/' + id });
const italy = topic('italy-old', '意大利山城旅遊', ['義大利']);
const uk = topic('uk', '英格蘭博物館', ['英國']);
const central = topic('hk', '中環美食', ['香港']);
const library = [...Array.from({ length: 205 }, (_, i) => topic('tw' + i, '台灣旅行', ['台灣'])), italy, uk, central];
async function scenario(body, overrides = {}) {
  const calls = { sessionReads: 0, ranges: [], previous: null, searches: 0, inserts: 0, updates: 0 };
  class Query {
    constructor(table) { this.table = table; this.filters = []; }
    select() { return this; } order() { return this; } limit() { return this; }
    eq(k, v) { this.filters.push([k, v]); return this; } or(v) { this.visibility = v; return this; }
    range(a, b) { this.rangeValue = [a, b]; calls.ranges.push([a, b]); return this; }
    maybeSingle() { return this; } single() { return this; }
    insert(v) { calls.inserts++; this.write = v; return this; }
    update(v) { calls.updates++; this.write = v; return this; }
    then(resolve, reject) {
      try {
        let data = null;
        if (this.table === 'egg_topic_ideas') {
          assert.equal(this.visibility, 'workspace_id.is.null,workspace_id.eq.workspace-a');
          assert(this.filters.some(([k, v]) => k === 'status' && v === 'published'));
          data = (overrides.library ?? library).slice(this.rangeValue[0], this.rangeValue[1] + 1);
        } else if (this.table === 'egg_command_sessions') {
          if (this.write) data = { id: 'new-session' };
          else { calls.sessionReads++; assert(this.filters.some(([k,v]) => k === 'workspace_id' && v === 'workspace-a')); data = { id: 'old-session', messages: [], interpreted_context: { location: '香港中環', goal: '附近美食' } }; }
        } else if (this.table === 'egg_creator_profiles') data = { content_categories: ['旅遊'] };
        else data = [];
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      } catch (error) { return Promise.reject(error).then(resolve, reject); }
    }
  }
  const route = load('src/app/api/egg/command/route.ts', {
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } },
    '@/lib/egg-api-context': { getEggRequestContext: async () => overrides.unauthorized ? null : ({ admin: { from: name => new Query(name) }, workspaceId: 'workspace-a', user: { id: 'user-a' } }) },
    '@/lib/command-policy': policy,
    '@/lib/command-research': {
      extractCommandIntent: async (_prompt, previous) => { calls.previous = previous; return overrides.intent ?? { location: '意大利', goal: '', format: 'Reel', on_camera: '', kind: 'inspiration' }; },
      researchCommand: async intent => { calls.searches++; if (overrides.searchError) throw Error('offline'); return { intent, searched: true, evidence: [] }; },
    },
    '@/lib/ai/anthropic': {
      getAnthropic: () => ({ messages: { create: async ({ messages }) => {
        const candidates = JSON.parse(messages[0].content.match(/題材庫：([^\n]+)/)[1]);
        const suggestions = overrides.emptySelection ? [] : candidates.slice(0, 3).map(t => ({ title: t.title, angle: '來源題材看點', reason: '', source_topic_id: t.id, production_mode: 'presenter' }));
        return { content: [{ type: 'text', text: JSON.stringify({ answer: '為你整理以下方向', suggestions, actions: [] }) }] }; } } }),
      parseJsonFromText: value => JSON.parse(value),
    },
  });
  const response = await route.POST({ json: async () => body });
  return { ...response, calls };
}
(async () => {
  for (const [mode, prompt] of [['daily', '請建議我今天可以發布甚麼內容'], ['recommended', '題材庫有哪些內容適合我？']]) {
    for (const explicit of [true, false]) {
      const r = await scenario({ prompt, mode: explicit ? mode : undefined, sessionId: 'old-session', location: { country: 'GB' } });
      assert.equal(r.status, 200); assert.equal(r.calls.sessionReads, 0); assert.equal(r.calls.inserts, 1); assert.equal(r.calls.updates, 0);
      assert.equal(r.data.interpreted.location, '英國'); assert.equal(r.data.interpreted.goal, ''); assert.equal(r.data.interpreted.format, '');
      assert.deepEqual([...r.data.suggestions.map(t => t.source_topic_id)], ['uk']);
    }
  }
  const paris = Array.from({length:8},(_,i)=>({...topic('paris'+i,'巴黎題材'+i,['巴黎']),countries:['FR'],localities:['Paris']}));
  let eight = await scenario({prompt:'巴黎八條'}, {library:paris,intent:{location:'法國巴黎',country:'FR',city:'巴黎',city_aliases:['Paris'],count:8,format:'',goal:'',kind:'inspiration'}});
  assert.equal(eight.data.suggestions.length,8); assert.equal(eight.calls.searches,0); assert.equal(eight.data.interpreted.count,'8');
  eight = await scenario({prompt:'巴黎八條'}, {library:paris.slice(0,1),intent:{location:'巴黎',city:'巴黎',count:8,goal:'',kind:'inspiration'},searchError:true});
  assert.equal(eight.data.suggestions.length,1); assert.equal(eight.calls.searches,1); assert(eight.data.answer.includes('1／8'));
  let r = await scenario({ prompt: '我去意大利想拍一啲 reel' });
  assert.equal(r.status, 200); assert.equal(r.calls.searches, 1); assert.equal(r.calls.ranges.length, 2);
  assert.equal(r.data.suggestions[0].source_topic_id, 'italy-old'); assert(r.data.suggestions[0].source_note.includes('待核實'));
  assert.equal(r.data.interpreted.kind, undefined);
  r = await scenario({ prompt: '意大利靈感' }, { emptySelection: true }); assert.equal(r.data.suggestions[0].source_topic_id, 'italy-old');
  const fixture = JSON.parse(fs.readFileSync('/Users/tommytsang/Desktop/SOON/docs/topic-library/2026-09-20-import-quality-fix/core-feed-final.json', 'utf8'));
  const actual = fixture.topics.map(t => ({ ...t, tags: t.keywords }));
  assert(policy.selectCommandTopics(actual, { location: '意大利', goal: '', kind: 'inspiration' }).some(t => t.title === '義大利百年傳統檸檬汁'));
  r = await scenario({ prompt: '繼續', sessionId: 'old-session' }); assert.equal(r.calls.sessionReads, 1); assert.equal(r.calls.previous.location, '香港中環');
  r = await scenario({ prompt: '今日題材', mode: 'daily', sessionId: 'old-session' }); assert.equal(r.data.interpreted.location, '');
  const nearby = { location: '香港中環', goal: '附近美食', format: 'Reel', on_camera: '', kind: 'nearby' };
  r = await scenario({ prompt: '中環附近美食' }, { intent: nearby }); assert.equal(r.calls.searches, 1); assert.equal(r.data.suggestions.length, 0);
  r = await scenario({ prompt: '中環附近美食' }, { intent: nearby, searchError: true }); assert.equal(r.status, 200); assert(r.data.answer.includes('搜尋暫時未完成'));
  r = await scenario({ prompt: '意大利' }, { unauthorized: true }); assert.equal(r.status, 401);
  const conflict = policy.selectCommandTopics([topic('wrong', '香港的意大利餐廳', ['香港'])], { location: '意大利', goal: '', kind: 'inspiration' }); assert.equal(conflict.length, 0);
  console.log('PASS: shortcut reset (new + legacy clients), explicit history, location privacy, >200-row library pagination, Italy aliases, source provenance, nearby strictness, failures and auth isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
