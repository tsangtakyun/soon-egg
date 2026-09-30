const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const web = fs.readFileSync('src/app/(dashboard)/tools/reply/ReplyClient.tsx','utf8');
const native = fs.readFileSync('/Users/tommytsang/Desktop/SOON/soon-idea-ios/app/(app)/tools/reply-centre.tsx','utf8');
const labels = ['互動提示','最近 7 日有互動','7–13 日沒有互動','14 日或以上沒有互動','按此項目在 EGG 的最近互動時間計算。'];
const runtime = { jsx:(type,props)=>({type,props}), jsxs:(type,props)=>({type,props}) };
function render(source, start, end, component, filter) {
  const code = `const styles = {}; const statusLabels = {negotiating:'洽談中',confirmed:'已確認',archived:'已封存'}; const replyProjectStatusLabels = statusLabels; const replyProjectStatuses = Object.keys(statusLabels); const useState = () => ['${filter}',()=>{}]; const ScrollView='ScrollView', View='View', Text='Text', RefreshControl='RefreshControl', TouchableOpacity='TouchableOpacity', Empty='Empty', ProjectListRows='ProjectListRows'; const Feather={};\n` + source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))) + `\nexports.component=${component};`;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>runtime,Date});
  return exports.component({projects:[],visible:true});
}
function text(node) { if(typeof node==='string')return node; if(Array.isArray(node))return node.map(text).join(' '); return node && typeof node==='object' ? text(node.props?.children) : ''; }
for(const filter of ['negotiating','confirmed','archived']) {
  for(const tree of [render(web,'function ProjectList(props:','function projectActivity','ProjectList',filter),render(native,'function ProjectsPanel({','function projectActivity','ProjectsPanel',filter)]) {
    const content = text(tree);
    for(const label of labels) assert.equal(content.includes(label),filter==='negotiating',`${filter}: ${label}`);
  }
}
for(const source of [web,native]) {
  const now = Date.now();
  class Clock extends Date { static now(){ return now; } }
  const start = source.indexOf('function projectActivity(');
  const end = source.indexOf('\nfunction ', start + 1);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nexports.activity=projectActivity;',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Date:Clock,Math});
  for(const [days,expected] of [[0,'green'],[6.99,'green'],[7,'yellow'],[13.99,'yellow'],[14,'red']]) {
    const result = exports.activity(new Date(now-days*86400000).toISOString());
    assert.equal(source===web ? result.className : result.color, source===web ? {green:'bg-green-500',yellow:'bg-yellow-400',red:'bg-red-500'}[expected] : {green:'#22c55e',yellow:'#eab308',red:'#dc2626'}[expected]);
  }
}
console.log('PASS: identical five legend labels on web/native, visible only for negotiating (including empty list), existing 7/14-day thresholds preserved.');
