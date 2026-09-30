const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/command-policy.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:exports_, Set, Date});
const p = exports_;
assert.equal(p.requestedCount('巴黎八條'),8);
assert.equal(p.requestedCount('8 ideas in Paris'),8);
assert.equal(p.requestedCount('十二個題材'),12);
assert.equal(p.requestedCount('繼續',8),8);
assert.equal(p.requestedCount('巴黎'),3);
const topics = [
 {id:'a',title:'巴黎麵包',countries:['FR'],localities:['Paris']},
 {id:'b',title:'博物館',countries:['FR'],localities:['巴黎']},
 {id:'c',title:'巴黎風餐廳',countries:['HK'],localities:['香港']},
 {id:'d',title:'Parisian style',countries:['GB'],localities:['London']},
].map(t=>({...t,summary:'',tags:[],category:'',source_url:'https://example.com/'+t.id}));
assert.deepEqual(Array.from(p.selectCommandTopics(topics,{location:'法國巴黎',country:'FR',city:'巴黎',city_aliases:['Paris'],goal:''}),x=>x.id),['a','b']);
assert.equal(p.uniqueCommandTopics([topics[0],{...topics[0],id:'dup'}]).length,1);
assert.equal(p.uniqueCommandTopics([{...topics[0],source_url:'https://youtube.com/watch?v=a'},{...topics[1],source_url:'https://youtube.com/watch?v=b'}]).length,2);
console.log('PASS quantity, Paris bilingual structured geography, wrong-country exclusion, source dedup');
