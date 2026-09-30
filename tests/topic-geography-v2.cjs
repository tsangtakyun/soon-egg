const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const root=process.cwd();
let replies=[],requests=0;
const client={messages:{create:async()=>{requests++;const next=replies.shift();if(next instanceof Error)throw next;return next;}}};
const cache={};
function load(file){
 if(cache[file])return cache[file];
 const exports={};cache[file]=exports;
 const requireMock=name=>name==='server-only'?{}:name.includes('ai/anthropic')?{getAnthropic:()=>client,parseJsonFromText:(s,f)=>{try{return JSON.parse(s)}catch{return f}}}:load(require('node:path').resolve(require('node:path').dirname(file),name+'.ts'));
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:requireMock,process,Date,console});return exports;
}
async function main(){
 const {parseTopicGeography:parse}=load(root+'/src/lib/topic-geography-contract.ts');
 const brazil={kind:'context',countries:['BR'],regions:[],localities:[],evidence:'巴西青年手寫履歷',confidence:'high'};
 assert.equal(parse(brazil,brazil.evidence).geography_status,'resolved');
 assert.equal(parse({...brazil,localities:['里約']},brazil.evidence).geography_status,'pending');
 assert.equal(parse({kind:'none',confidence:'high',countries:[],evidence:'漫畫小狗日常'},'漫畫小狗日常').geography_status,'not_applicable');
 const {extractTopicGeography:extract,researchTopicGeography:research}=load(root+'/src/lib/topic-geography-extraction.ts');
 const resolved=await extract(brazil.evidence,brazil);
 assert.equal(resolved.geography_retry_at,null);assert.equal(requests,0);
 const preserved=await extract('地點不詳',{confidence:'unknown'},{geography_status:'resolved',countries:['BR']});
 assert.equal(preserved.countries,undefined);assert.equal(preserved.geography_retry_at,null);
 const empty=await extract('');assert.equal(empty.geography_status,'unknown');assert.equal(empty.geography_retry_at,null);
 replies=[new Error('timeout')];const failed=await extract('unknown venue');
 assert.equal(failed.geography_error,'extraction_request_failed');assert.ok(failed.geography_retry_at);assert.equal(failed.countries,undefined,'failure never erases previous location');
 const quote='The chapel is in Kutaisi Botanical Garden.';
 const geo={kind:'place',countries:['GE'],localities:['Kutaisi'],regions:[],evidence:quote,confidence:'high'};
 const url='https://georgia.travel/family-attractions/kutaisi-botanical-garden';
 replies=[{content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url}]},{type:'text',text:JSON.stringify({geography:geo}),citations:[{type:'web_search_result_location',url,cited_text:quote}]}]}];
 assert.equal((await research('Georgia oak chapel')).localities[0],'Kutaisi');
 replies=[{content:[{type:'text',text:JSON.stringify({geography:geo}),citations:[{type:'web_search_result_location',url,cited_text:quote}]}]}];
 assert.equal(await research('Georgia oak chapel'),null,'fabricated citations rejected without actual search result');
 for(const dir of [root+'/src/lib','/Users/tommytsang/Desktop/SOON/soon-idea-ios/src/lib']){
   const countries=load(dir+'/topicCountries.ts');
   assert.equal(countries.topicLocationLabel({countries:['BR'],geography_kind:'context',tags:['巴黎'],localities:['巴黎']}),'🇧🇷 巴西');
   assert.equal(countries.topicLocationLabel({countries:['FR'],geography_kind:'none',tags:['巴黎']}),'');
   assert.equal(countries.topicLocationLabel({countries:['AL'],localities:['Himara']}),'🇦🇱 阿爾巴尼亞 · Himara');
   assert.equal(countries.topicLocationLabel({countries:['GE'],localities:['Kutaisi']}),'🇬🇪 格魯吉亞 · Kutaisi');
 }
 console.log('PASS context flags, no invented city, non-geographic content, observable retry, actual search citation grounding, web/App parity');
}
main().catch(error=>{console.error(error);process.exitCode=1});
