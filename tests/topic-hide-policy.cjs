const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict'), ts = require('typescript');
function load(path, dependencies = {}, globals = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports, console, URL, Request, Response, process, ...globals, require: name => dependencies[name] || {}});
 return exports;
}
(async () => {
 for (const mobile of [false, true]) {
  let updates=0, dbCalls=0, otherWorkspace=false;
  const preference={saved:true,want_to_create:true,dismissed:false};
  const admin = { auth:{getUser:async()=>({data:{user:{id:'user',email:'admin@example.test'}}})},
   from(table) {dbCalls++; const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{id:'topic',workspace_id:otherWorkspace?'someone-else':'workspace'}}),
    upsert:async patch => { assert.equal(table,'egg_topic_actions'); assert.equal(patch.workspace_id,'workspace'); Object.assign(preference,patch); updates++; return {error:null}; }};
    return q;
   }};
  const route=load(mobile?'src/app/api/mobile/topics/route.ts':'src/app/api/topics/route.ts', {
   'next/server':{NextResponse:{json:(value,init)=>Response.json(value,init)}},
   '@/lib/supabase/server':{createClient:async()=>admin},
   '@/lib/creator-workspace':{createEggAdmin:()=>admin,getCreatorWorkspaceContext:async()=>({user:{id:'user'},admin,activeWorkspace:{id:'workspace'}})},
   '@/lib/topic-library':{getTopicMembership:async()=>({admin,workspaceId:'workspace',role:'owner'})},
   '@/lib/platform-admin':{isEggPlatformAdmin:()=>true}
  });
  const denied = await route.DELETE(new Request('https://egg.test/api/topics?ideaId=topic',{method:'DELETE'}));
  assert.equal(denied.status,403); assert.equal(dbCalls,0,'even admin delete must never touch database');
  const post=action=>route.POST(new Request('https://egg.test/api/topics',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify({ideaId:'topic',action})}));
  assert.equal((await post('dismiss')).status,200); assert.equal(preference.dismissed,true);
  assert.equal(preference.saved,true); assert.equal(preference.want_to_create,true);
  assert.equal((await post('restore')).status,200); assert.equal(preference.dismissed,false);
  assert.equal(preference.saved,true); assert.equal(preference.want_to_create,true);
  assert.equal((await post('save')).status,200); assert.equal(preference.want_to_create,true);
  otherWorkspace=true; const before=updates;
  assert.equal((await post('dismiss')).status,404); assert.equal(updates,before,'cross-workspace target rejected');
  assert.equal((await post('delete')).status,400);
 }
 const crossSurfacePreference={saved:false,want_to_create:false,dismissed:false,updated_at:null};
 const crossSurfaceAdmin={auth:{getUser:async()=>({data:{user:{id:'user',email:'creator@example.test'}}})},from(table){
  const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{id:'topic',workspace_id:'workspace'}}),
   upsert:async patch=>{assert.equal(table,'egg_topic_actions');assert.equal(patch.workspace_id,'workspace');Object.assign(crossSurfacePreference,patch);return {error:null};}};
  return q;
 }};
 const deps={
  'next/server':{NextResponse:{json:(value,init)=>Response.json(value,init)}},
  '@/lib/supabase/server':{createClient:async()=>crossSurfaceAdmin},
  '@/lib/creator-workspace':{createEggAdmin:()=>crossSurfaceAdmin,getCreatorWorkspaceContext:async()=>({user:{id:'user'},admin:crossSurfaceAdmin,activeWorkspace:{id:'workspace'}})},
  '@/lib/topic-library':{getTopicMembership:async()=>({admin:crossSurfaceAdmin,workspaceId:'workspace',role:'member'})},
  '@/lib/platform-admin':{isEggPlatformAdmin:()=>false}
 };
 const webRoute=load('src/app/api/topics/route.ts',deps);
 const mobileRoute=load('src/app/api/mobile/topics/route.ts',deps);
 const action=(route,value)=>route.POST(new Request('https://egg.test/api/topics',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json','x-egg-workspace-id':'workspace'},body:JSON.stringify({ideaId:'topic',action:value})}));
 const savedResponse=await action(webRoute,'save');
 const savedBody=await savedResponse.json();
 assert.equal(savedBody.saved,true);assert.ok(savedBody.savedAt);assert.equal(crossSurfacePreference.saved,true,'web save is persisted for mobile');
 const unsavedResponse=await action(mobileRoute,'unsave');
 const unsavedBody=await unsavedResponse.json();
 assert.equal(unsavedBody.saved,false);assert.equal(unsavedBody.savedAt,null);assert.equal(crossSurfacePreference.saved,false,'mobile unsave is persisted for web');
 const local = [
  {id:'hidden',workspace_id:'workspace',created_by:'user',title:'Hidden',tags:[],created_at:'2026-09-21',import_state:'ready'},
  {id:'visible',workspace_id:'workspace',created_by:'user',title:'Visible',tags:[],created_at:'2026-09-21',import_state:'ready'}
 ];
 const actions=[{idea_id:'hidden',dismissed:true,saved:true,want_to_create:true}];
 const feedAdmin={from(table){
  let updating=false;
  const q={update(){updating=true;return q},select(){return q},eq(){return q},lt(){return q},order(){return q},maybeSingle(){return q},
   then(resolve){return Promise.resolve({error:null,data:updating?null:table==='egg_topic_ideas'?local:table==='egg_topic_actions'?actions:null}).then(resolve)}};
  return q;
 }};
 const feed=load('src/lib/topic-library.ts',{
  '@/lib/creator-dna':load('src/lib/creator-dna.ts'),
  '@/lib/topic-recommendations':load('src/lib/topic-recommendations.ts'),
  '@/lib/topicGeography':load('src/lib/topicGeography.ts'),
  '@/lib/creator-workspace':{createEggAdmin:()=>feedAdmin},
  '@/lib/topicCountries':{topicCountries:()=>[]},
 },{fetch:async()=>Response.json({topics:[]}),process:{env:{}},AbortSignal});
 const visible=await feed.listTopicIdeas('workspace','user');
 assert.equal(visible.length,1);assert.equal(visible[0].id,'visible','normal feeds exclude hidden ideas');
 const all=await feed.listTopicIdeas('workspace','user',undefined,{includeHidden:true});
 assert.equal(all.length,2);const hidden=all.find(idea=>idea.id==='hidden');
 assert.equal(hidden.dismissed,true);assert.equal(hidden.saved,true);assert.equal(hidden.want_to_create,true);
 const geo=load('src/lib/topicGeography.ts');
 assert.equal(geo.canonicalCountry('台灣'),'TW'); assert.equal(geo.canonicalCountry('臺灣'),'TW');
 assert.equal(geo.canonicalCountry('UK'),'GB'); assert.equal(geo.canonicalCountry('英國'),'GB');
 assert.equal(geo.topicCountryKeys({countries:['台灣','TW','臺灣']}).length,1);
 assert.ok(geo.matchesCountry({countries:['台灣']},'TW'));
 assert.ok(geo.matchesCountry({countries:['UK']},'GB'));
 assert.equal(geo.countryLabel('GB'),'🇬🇧 英國');
 assert.equal(geo.countryLabel('IT'),'🇮🇹 意大利');
 console.log('PASS web/mobile bookmark contract and timestamps; DELETE fail-closed without DB; hide/restore preserves saved/create; workspace isolation; default feeds exclude hidden; library opt-in restores hidden metadata; country aliases.');
})().catch(error=>{console.error(error);process.exitCode=1});
