const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const timers = new Map(); let nextTimer = 1; let cleanups = [];
const exportsForTest = {};
const code = fs.readFileSync('src/app/(dashboard)/tools/reply/ReplyClient.tsx', 'utf8') + '\nexport { ProjectOpenButton, ProjectActionMenu };';
const runtime = { jsx: (type, props) => ({type,props}), jsxs: (type, props) => ({type,props}) };
const policy = { replyProjectStatuses: ['negotiating','confirmed','archived'], replyProjectStatusLabels: { negotiating:'洽談中',confirmed:'已確認',archived:'已封存' } };
vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: exportsForTest,
  require: name => name === 'react/jsx-runtime' ? runtime : name === 'react' ? { useRef: current => ({current}), useEffect: callback => { const cleanup = callback(); if(cleanup) cleanups.push(cleanup); } } : name === '@/lib/reply-project-status' ? policy : {},
  setTimeout: callback => { const id = nextTimer++; timers.set(id,callback); return id; }, clearTimeout: id => timers.delete(id), Math,
});
function gesture() {
  const calls = []; const button = exportsForTest.ProjectOpenButton({project:{id:'row-b',name:'B'},onSelect:id=>calls.push(['select',id]),onMenu:id=>calls.push(['menu',id])});
  return {calls, p:button.props};
}
const down = {pointerType:'touch',clientX:10,clientY:10};
let g = gesture(); g.p.onPointerDown(down); g.p.onPointerUp(); g.p.onClick(); assert.equal(g.calls[0][0],'select'); assert.equal(timers.size,0);
g = gesture(); g.p.onPointerDown(down); for(const callback of timers.values()) callback(); g.p.onPointerUp(); g.p.onClick(); assert.equal(JSON.stringify(g.calls),JSON.stringify([['menu','row-b']]));
g = gesture(); g.p.onPointerDown(down); g.p.onPointerMove({clientX:10,clientY:45}); assert.equal(timers.size,0); assert.equal(g.calls.length,0);
g = gesture(); g.p.onPointerDown(down); g.p.onPointerCancel(); assert.equal(timers.size,0);
g = gesture(); g.p.onPointerDown(down); cleanups.forEach(fn=>fn()); assert.equal(timers.size,0); cleanups=[];
function buttons(node) { if(!node || typeof node !== 'object') return []; if(Array.isArray(node)) return node.flatMap(buttons); return [...(node.type==='button'?[node]:[]), ...buttons(node.props?.children)]; }
for(const status of policy.replyProjectStatuses) {
  const actions = buttons(exportsForTest.ProjectActionMenu({project:{id:'row-b',name:'B',lifecycle_status:status},busy:false,onClose(){},onStatus(){},onDelete(){}}));
  assert.equal(actions.length,4); assert.equal(actions[2].props.children,'永久刪除'); assert.equal(actions[3].props.children,'取消');
}
const native = fs.readFileSync('/Users/tommytsang/Desktop/SOON/soon-idea-ios/app/(app)/tools/reply-centre.tsx','utf8');
assert.ok(native.includes('onLongPress={() => onMenu(project)}'));
assert.ok(native.includes('delayLongPress={450}'));
assert.ok(!native.includes('目前狀態'));
assert.ok(!native.includes('accessibilityLabel={`刪除 ${project.name}`}'));
console.log('PASS: tap/long press separation, scrolling/cancel/unmount timer cleanup, selected-row targeting, state-specific menu with delete last, native wiring.');
