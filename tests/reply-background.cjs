const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let authenticated = true, calls = 0, fail = false;
const tasks = [], jobs = new Map();
class Query {
  constructor(table) { this.table = table; this.filters = []; }
  select() { return this; } order() { return this; } limit() { return this; }
  single() { return this; } maybeSingle() { return this; }
  eq(key, value) { this.filters.push([key, value]); return this; }
  gte() { return this; }
  insert(value) { this.inserted = value; return this; }
  update(value) { this.updated = value; return this; }
  then(resolve) {
    let data = null;
    if (this.table === 'egg_reply_projects') {
      assert(this.filters.some(([k,v]) => k === 'creator_id' && v === 'workspace-a'));
      data = this.filters.some(([k,v]) => k === 'id' && v === 'project-a') ? { id:'project-a', name:'Test', brief:{} } : null;
    } else if (this.table === 'egg_reply_prompt_profiles') data = { system_prompt:'test rules' };
    else if (this.table === 'egg_reply_generation_jobs') {
      if (this.inserted) { jobs.set(this.inserted.id, { ...this.inserted, created_at:new Date().toISOString() }); data = jobs.get(this.inserted.id); }
      else {
        assert(this.filters.some(([k,v]) => k === 'creator_id' && v === 'workspace-a'));
        data = [...jobs.values()].reverse().find(row => this.filters.every(([k,v]) => row[k] === v)) || null;
        if (this.updated && data) Object.assign(data, this.updated);
      }
    }
    return Promise.resolve({ data, error:null, count:0 }).then(resolve);
  }
}
const admin = { from: table => new Query(table), auth:{ getUser:async()=>({data:{user:authenticated ? {id:'user-a',email:'test@example.invalid'} : null}}) } };
const exportsObject = {};
const deps = {
  'next/server': { after:fn=>tasks.push(fn), NextResponse:{json:(body,options)=>Response.json(body,options)} },
  '@/lib/supabase/server':{createClient:async()=>admin},
  '@/lib/creator-workspace':{createEggAdmin:()=>admin,getActiveCreatorProfile:async()=>({profile:{id:'workspace-a'},activeRole:'owner'})},
  '@/lib/ai/anthropic':{getAnthropic:()=>({messages:{create:async()=>{calls++; if(fail)throw Error('provider offline');return {content:[{type:'text',text:JSON.stringify({brief:{summary:'摘要'},reply:'測試回覆'})}],usage:{input_tokens:1,output_tokens:2}}}}})},
  '@/lib/reply-language':{buildReplyLanguageInstruction:()=>''},
  '@/lib/reply-attachments':{withReplyAttachment:text=>text},
  '@/lib/reply-workspace-rules':{},
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/tools/reply/chat/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
  {exports:exportsObject,require:name=>{assert(name in deps,name);return deps[name];},process:{env:{}},Date,Set,JSON,URL,console:{error:()=>{}}});
const id='00000000-0000-4000-8000-000000000001';
const post = (requestId=id,projectId='project-a') => exportsObject.POST({json:async()=>({background:true,requestId,projectId,message:'請草擬回覆'})});
const get = projectId => exportsObject.GET({url:'https://egg.test/api/tools/reply/chat?projectId='+projectId});
(async()=>{
  authenticated=false;assert.equal((await post()).status,401);assert.equal((await get('project-a')).status,401);
  authenticated=true;assert.equal((await post(id,'foreign-project')).status,404);
  assert.equal((await post()).status,202);assert.equal(calls,0);assert.equal(tasks.length,1);
  assert.equal((await (await get('project-a')).json()).job.status,'processing');
  assert.equal((await (await get('foreign-project')).json()).job,null);
  assert.equal((await post()).status,202);assert.equal(tasks.length,1,'same ID must not generate twice');
  assert.equal((await post('00000000-0000-4000-8000-000000000002')).status,409);
  await tasks.shift()(); assert.equal(calls,1);assert.equal(jobs.get(id).status,'completed');
  assert.equal((await (await get('project-a')).json()).job.result.reply,'測試回覆');
  fail=true;const failedId='00000000-0000-4000-8000-000000000003';
  assert.equal((await post(failedId)).status,202);await tasks.shift()();assert.equal(jobs.get(failedId).status,'failed');
  assert.equal(jobs.get(failedId).result.input,'請草擬回覆');
  jobs.get(failedId).status='processing';jobs.get(failedId).created_at=new Date(Date.now()-400000).toISOString();
  assert.equal((await (await get('project-a')).json()).job.status,'failed');
  console.log('PASS background acceptance before generation, persistence/recovery, auth/workspace isolation, duplicate ID, pending guard, provider failure, draft recovery, timeout.');
})().catch(error=>{console.error(error);process.exitCode=1;});
