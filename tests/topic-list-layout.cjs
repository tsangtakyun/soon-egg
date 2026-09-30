const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const cache = new Map();
function load(file) {
  if(cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file,exports);
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,require:(name)=>{
    if(name==='next/navigation') return {useRouter:()=>({push(){},refresh(){}})};
    if(name==='next/link') return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
    if(name.startsWith('@/')||name.startsWith('.')) { const base=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(file),name); return load(base+'.ts'); }
    return require(name);
  },Set,Map,Date,Intl,URL,console});
  return exports;
}
const Component=load(path.resolve('src/app/(dashboard)/topic-library/TopicLibraryClient.tsx')).TopicLibraryClient;
const ideas=Array.from({length:5},(_,i)=>({id:String(i),title:'巴黎長標題測試：保留完整題材並在列表顯示兩行 '+i,summary:'不應出現在精簡列表的長摘要',scope:'central',category:'美食',platform:'Threads',tags:[],countries:['FR'],localities:['巴黎'],geography_kind:'place',saved:i===0,image_url:null}));
const html=renderToStaticMarkup(React.createElement(Component,{initialIdeas:ideas,canManageCovers:false}));
assert.equal((html.match(/<article /g)||[]).length,5);
assert.equal((html.match(/查看題材：/g)||[]).length,5);
assert.equal((html.match(/管理題材：/g)||[]).length,5);
assert(html.includes('h-20 w-20'));
assert(!html.includes('不應出現在精簡列表的長摘要'));
assert(!html.includes('開始製作'));
let depth=0; for (const tag of html.match(/<\/?button\b[^>]*>/g)||[]) { if(tag.startsWith('</')) depth--; else { assert.equal(depth,0,'button nesting'); depth++; } } assert.equal(depth,0);
if(process.argv.includes('--html')) console.log(JSON.stringify(html));
else console.log('PASS: five compact cards rendered, square fallback thumbnails, separate controls, no summary/production CTA in list');
