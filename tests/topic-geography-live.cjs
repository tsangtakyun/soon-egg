const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(root,file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${root}/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>load(root,name.replace('./',''))});return exports;}
async function main(){
 const web=load('src/lib','topicCountries'),app=load('/Users/tommytsang/Desktop/SOON/soon-idea-ios/src/lib','topicCountries');
 const expected=[['812b4b08-4af4-411c-b782-dfa2382f49ff','🇳🇱 荷蘭 · 阿姆斯特丹'],['42a9be99-78e3-46fa-9421-7994d7dc3487','🇭🇰 香港 · 尖沙咀'],['9eb7afd1-fa5a-4f3c-8d81-c8868a1f4f1e','🇫🇷 法國 · 巴黎']];
 for(const url of ['https://egg.sooncreator.network/api/public/topics?verify=geography','https://soon-core.vercel.app/api/topics?consumer=egg-web&limit=60','https://soon-core.vercel.app/api/topics?consumer=egg-app&limit=60']){
  const response=await fetch(url);assert.equal(response.status,200);const {topics}=await response.json();
  for(const [id,label] of expected){const row=topics.find(x=>x.id===id);assert.ok(row,id);assert.equal(web.topicLocationLabel(row),label);assert.equal(app.topicLocationLabel(row),label);}
  console.log('PASS live geography feed + website/native label parity:',url);
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
