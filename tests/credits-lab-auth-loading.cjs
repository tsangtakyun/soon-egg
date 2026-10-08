const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function fixture() {
  const state = [], effects = [];
  let cursor = 0, finish;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useEffect(callback) { effects.push(callback); },
  };
  const box = { exports: {} };
  const context = { module: box, exports: box.exports, crypto: require('node:crypto').webcrypto, AbortSignal,
    fetch: (_url, options) => {
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal);
      return new Promise((resolve, reject) => { finish = { resolve, reject }; });
    },
    require: name => name === 'react' ? hooks : name === 'react/jsx-runtime' ? require(name) : (() => { throw Error(name); })(),
  };
  const code = ts.transpileModule(fs.readFileSync('src/app/credits-lab/page.staging.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, context);
  function tree() { cursor = 0; return box.exports.default(); }
  function html() { return renderToStaticMarkup(tree()); }
  return { html, tree, begin: () => effects[0](), response: (status, data) => finish.resolve({ status, ok: status < 400, json: async () => data }),
    fail: () => finish.reject(Error('network')), effects };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function buttons(node, found = []) {
  if (!React.isValidElement(node)) return found;
  if (node.type === 'button') found.push(node);
  React.Children.forEach(node.props.children, child => buttons(child, found));
  return found;
}
async function main() {
  let f = fixture();
  assert.match(f.html(), /正在確認登入/);
  assert.doesNotMatch(f.html(), /<form|type="email"|type="password"/);
  f.begin();
  assert.doesNotMatch(f.html(), /<form/); // unresolved/slow request never exposes input
  f.response(200, { userId: 'owner', members: [], status: null }); await flush();
  assert.match(f.html(), /已登入/); assert.doesNotMatch(f.html(), /<form/);

  f = fixture(); f.html(); f.begin(); f.response(401, {}); await flush();
  assert.match(f.html(), /<form/); assert.match(f.html(), /type="email"/);

  f = fixture(); f.html(); f.begin(); f.fail(); await flush();
  assert.match(f.html(), /無法確認登入狀態/); assert.doesNotMatch(f.html(), /<form/);
  const retry = buttons(f.tree()).find(button => button.props.children === '重新確認登入');
  assert.ok(retry); retry.props.onClick();
  assert.match(f.html(), /正在確認登入/); assert.doesNotMatch(f.html(), /<form/);

  f = fixture(); f.html(); const cleanup = f.begin(); cleanup(); f.response(401, {}); await flush();
  assert.doesNotMatch(f.html(), /<form/); // unmounted request cannot reveal stale UI
  console.log('PASS auth-loading render/state regression: pending, authenticated, 401, failure, retry, cleanup. Mocked response evidence, not live login proof.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
