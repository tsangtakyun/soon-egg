const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
  return exports;
}

const status = load('src/lib/reply-project-status.ts');
assert.equal(status.canDraftQuotation('negotiating'), true);
assert.equal(status.canDraftQuotation('confirmed'), true);
assert.equal(status.canDraftQuotation('archived'), false);
assert.equal(status.replyProjectStatusLabels.confirmed, '客戶已接受');

const route = fs.readFileSync('src/app/api/quotations/route.ts', 'utf8');
assert.equal((route.match(/neq\('lifecycle_status', 'archived'\)/g) || []).length, 2);
assert.ok(!route.includes("eq('lifecycle_status', 'confirmed')"));
assert.ok(route.includes("current.status !== 'approved'"), 'sending still requires human approval first');
assert.ok(route.includes("context.role !== 'owner' && context.role !== 'admin'"), 'approval remains owner/admin restricted');

const page = fs.readFileSync('src/app/(dashboard)/quotations/page.tsx', 'utf8');
assert.ok(page.includes('.neq("lifecycle_status", "archived")'));
const reply = fs.readFileSync('src/app/(dashboard)/tools/reply/ReplyClient.tsx', 'utf8');
assert.ok(reply.includes('標記客戶已接受'));
assert.ok(reply.includes('洽談中可先整理；人工批核後先發出'));
assert.ok(reply.includes('(project.lifecycle_status ?? "negotiating") !== "archived"'));

console.log('PASS: negotiating projects can draft quotations; archived projects remain blocked; client acceptance is distinct from quote approval and remains an explicit action.');
