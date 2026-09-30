const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const native = '/Users/tommytsang/Desktop/SOON/soon-idea-ios';
function check(file, handlerName, setter) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText(tree) === handlerName) handler = node;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(handler, handlerName);
  // Neither request start, success nor failure may clear/overwrite the composer.
  // This also protects text edited while a request is pending and shortcut drafts.
  assert.ok(!handler.getText(tree).includes(`${setter}(`), `${handlerName} overwrites input`);
  assert.ok(source.includes('試試輸入：我想在香港拍一條 reel ！'));
  assert.ok(source.includes(`${setter}(`), 'User editing/reset must remain available');
}
check(path.join(__dirname, '../src/components/dashboard/EggCommandCenter.tsx'), 'ask', 'setInput');
check(path.join(native, 'app/(egg)/creator/home.tsx'), 'runCommand', 'setCommand');
const screen = fs.readFileSync(path.join(native, 'src/components/egg/EggScreen.tsx'), 'utf8');
assert.ok(screen.includes('flexGrow: 1'));
assert.ok(screen.includes('paddingTop: 0, paddingBottom: 0'));
assert.ok(fs.readFileSync(path.join(native, 'app/(egg)/creator/home.tsx'), 'utf8').includes('showBrand={false} centered'));
console.log('PASS: both composers preserve drafts across requests; exact placeholder; full-height centered native fallback (source regression).');
