const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function moduleFrom(path, imports, extra = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, require: (name) => imports[name], URL, AbortSignal, process: { env: {} }, console, ...extra });
  return module.exports;
}
let fetched = 0, writes = [], queries = [];
const admin = { from(table) {
  const query = {table, filters:[]}; queries.push(query);
  const result = () => table === "egg_creator_profiles" ? {data:{instagram_access_token:"secret",audience_demographics:{instagram_sync:{provider:"facebook"}}}} : {data:{id:"row1",instagram_media_id:"123"}};
  const chain = {select(){return chain},eq(k,v){query.filters.push([k,v]);return chain},maybeSingle:async()=>result(),update(v){writes.push(v);return chain},then(resolve){resolve({error:null})}};
  return chain;
}};
const covers = moduleFrom("src/lib/instagram-covers.ts", {}, {fetch:async(url, options)=>{
  fetched++; assert.equal(url.hostname,"graph.facebook.com"); assert.equal(options.headers.Authorization,"Bearer secret"); assert.equal(url.searchParams.has("access_token"),false);
  return {ok:true,json:async()=>({media_type:"VIDEO",media_url:"https://cdn.test/video.mp4",thumbnail_url:"https://cdn.test/fresh.jpg"})};
}});
(async()=>{
  assert.equal(covers.coverUrl({media_type:"VIDEO",media_url:"https://cdn.test/video.mp4"}),null);
  assert.equal(covers.coverUrl({media_type:"IMAGE",media_url:"https://cdn.test/photo.jpg"}),"https://cdn.test/photo.jpg");
  assert.equal(covers.coverUrl({thumbnail_url:"javascript:bad"}),null);
  assert.equal(await covers.refreshInstagramCover(admin,"workspace1","row1"),"https://cdn.test/fresh.jpg");
  assert.equal(fetched,1);
  assert.deepEqual(Object.keys(writes[0]).sort(),["media_url","thumbnail_url"]);
  const selected = [];
  const rankingAdmin = {from(table) {
    let fields = "";
    const chain = {
      select(v){fields=v;return chain},
      eq(k,v){if(fields==="id,instagram_media_id" && k==="id") selected.push(v);return chain},
      order(){return chain},
      limit(n){assert.equal(n,50);return Promise.resolve({data:Array.from({length:20},(_,i)=>({id:String(i),views:i}))})},
      maybeSingle:async()=>({data:null}),
    }; return chain;
  }};
  await covers.refreshTopInstagramCovers(rankingAdmin,"workspace1");
  assert.deepEqual(selected,["19","18","17","16","15"]);
  for(const q of queries.filter(q=>q.table==="egg_instagram_media")) assert.ok(q.filters.some(([k,v])=>k==="creator_id"&&v==="workspace1"));
  const missing = {from(){const chain={select(){return chain},eq(){return chain},maybeSingle:async()=>({data:null})};return chain}};
  assert.equal(await covers.refreshInstagramCover(missing,"other","row1"),null);
  assert.equal(fetched,1);
  let context = null, refreshes = 0;
  const route = moduleFrom("src/app/api/instagram/media-cover/route.ts", {
    "next/server":{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},
    "@/lib/egg-api-context":{getEggRequestContext:async()=>context},
    "@/lib/instagram-covers":{refreshInstagramCover:async(a,w,id)=>{refreshes++;assert.equal(w,"workspace1");return null}}
  });
  assert.equal((await route.POST({json:async()=>({mediaId:"row1"})})).status,401);
  context={admin,workspaceId:"workspace1"};
  assert.equal((await route.POST({json:async()=>({mediaId:"https://evil.test"})})).status,400);
  assert.equal(refreshes,0);
  assert.equal((await route.POST({json:async()=>({mediaId:"row1"})})).status,404);
  assert.equal(refreshes,1);
  console.log("PASS image/video selection, fresh Graph cover, workspace isolation, cover-only writes, anonymous denial and invalid ID rejection.");
})().catch(e=>{console.error(e);process.exitCode=1});
