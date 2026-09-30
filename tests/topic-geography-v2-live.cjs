const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(root,file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${root}/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>load(root,name.replace('./',''))});return exports;}
async function main(){
 const res=await fetch('https://egg.sooncreator.network/api/public/topics?verify=geography-v2-'+Date.now());assert.equal(res.status,200);
 const {topics}=await res.json();
 const cases=[['e71c7097','AL','Himara'],['f25080f1','GE','Kutaisi'],['9554ddcc','JP',null],['fb85b1a2','IS','Ölfus']];
 for(const [prefix,country,city] of cases){const row=topics.find(x=>x.id.startsWith(prefix));assert.ok(row,prefix);assert.equal(row.countries[0],country);if(city)assert.equal(row.localities[0],city);else {assert.equal(row.geography_kind,'context');assert.equal(row.localities.length,0);}assert.equal(row.geography_source_text,undefined);}
 for(const root of ['src/lib','/Users/tommytsang/Desktop/SOON/soon-idea-ios/src/lib']){
  const {topicLocationLabel:label}=load(root,'topicCountries');
  assert.equal(label(topics.find(x=>x.id.startsWith('f25080f1'))),'🇬🇪 格魯吉亞 · Kutaisi');
  assert.equal(label(topics.find(x=>x.id.startsWith('9554ddcc'))),'🇯🇵 日本');
 }
 const denied=await fetch('https://egg.sooncreator.network/api/cron/topic-geography');assert.equal(denied.status,401);
 console.log('PASS production API: Albania/Himara, Georgia/Kutaisi, Iceland/Ölfus, Japan cultural context, private source excluded, web/App labels, cron rejects unauthenticated access');
}
main().catch(error=>{console.error(error);process.exitCode=1});
