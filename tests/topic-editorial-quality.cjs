const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(path,require=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require,console,process:{env:{}}});return exports;}
const quality=load('src/lib/topic-editorial-quality.ts');
const good={title:'巴黎 Cedric Grolet Opéra：層次分明的可頌',summary:'原帖介紹巴黎門店的可頌，外皮酥脆，內層柔軟而富有層次。',category:'美食',tags:[],content_format:'short_video'};
const bad={...good,title:'Threads創作者內容靈感',summary:'minidietitian_foodiary\n⑧threads\n巴黎可頌外皮酥脆，內層柔軟。'};
assert.equal(quality.hasUsefulTopicEditorial(bad),false);
assert.equal(quality.hasUsefulTopicEditorial(good),true);
assert.equal(quality.cleanTopicSummary(bad.summary),'巴黎可頌外皮酥脆，內層柔軟。');
assert.equal(quality.hasUsefulTopicEditorial({...good,title:'一小隻營養師 (@name) on Threads'}),false);
assert.equal(quality.hasUsefulTopicEditorial({...good,summary:'username_only'}),false);
let calls=0,result=good,fail=false;
const repair=load('src/lib/topic-editorial-repair.ts',name=>name.includes('quality')?quality:name.includes('anthropic')?{getAnthropic:()=>({messages:{create:async()=>{calls++;if(fail)throw Error('timeout');return{content:[{type:'text',text:JSON.stringify(result)}]};}}}),parseJsonFromText:JSON.parse}:{});
(async()=>{
 assert.equal((await repair.ensureTopicEditorial(good,'source')).title,good.title);assert.equal(calls,0);
 assert.equal((await repair.ensureTopicEditorial(bad,'巴黎門店可頌')).category,'美食');assert.equal(calls,1);
 result=bad;assert.equal(await repair.ensureTopicEditorial(bad,'source'),null);
 fail=true;assert.equal(await repair.ensureTopicEditorial(bad,'source'),null);
 for(const file of ['src/app/api/mobile/topics/route.ts','src/app/api/topics/route.ts'])assert.match(fs.readFileSync(file,'utf8'),/await ensureTopicEditorial/);
 console.log('PASS generic/author titles, summary cleanup, successful repair, no unnecessary retry and failed retry blocked');
})().catch(e=>{console.error(e);process.exitCode=1});
