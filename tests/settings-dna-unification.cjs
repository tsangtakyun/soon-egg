const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/creator-dna.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out});
assert.equal(JSON.stringify(out.dnaCategories({primary_industry_code:'trend_culture',secondary_industry_codes:['food_beverage','travel_experience']},['科技'])),JSON.stringify(['飲食','旅遊','潮流文化']));
assert.equal(JSON.stringify(out.dnaCategories(null,['科技'])),JSON.stringify(['科技']));
assert.equal(JSON.stringify(out.dnaCategories({primary_industry_code:'unknown',secondary_industry_codes:[]},['科技'])),JSON.stringify(['科技']));
for(const path of ['src/app/api/settings/profile/route.ts','src/app/api/mobile/settings/route.ts'])assert(!/content_categories\s*:/.test(fs.readFileSync(path,'utf8')),'Profile saves must not overwrite legacy categories');
const web=fs.readFileSync('src/app/(dashboard)/settings/SettingsClient.tsx','utf8');assert(!web.includes('selectedCategories'));assert(web.includes('管理 Instagram 連接'));assert(web.includes('failedAvatar'));
console.log('PASS DNA authoritative classification, legacy fallback retained, profile saves cannot erase categories, IG and avatar recovery UI.');
