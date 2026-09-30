const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, Date, Intl, console });
  return exports;
}

const { quotationPrefill } = load('src/lib/quotation-prefill.ts');
const { calculateQuote } = load('src/lib/reply-quotation.ts');

const brief = {
  brand: 'LE-TA-SU 一人一鍋',
  contact: 'Vivian · Madbox Communications',
  collaborationType: 'Instagram Reel Collaboration',
  deliverables: ['1 × Instagram Reel（9:16，120–180 秒）', '1 × 中文文案', '1 × IG Story（贈送）', '7 日成效摘要（贈送）'],
  timeline: '08/10/2026 拍攝；20/10/2026 或之前發布',
  budget: 'HKD 13,000',
};
const prefill = quotationPrefill(brief, 'HKD');
assert.equal(prefill.amount, '13000');
assert.equal(prefill.deliverable.split('\n').length, 4);
assert.equal(quotationPrefill({ budget: '100–200 萬韓圜' }, 'HKD').amount, '');
assert.equal(quotationPrefill({ budget: 'KRW 1,500,000' }, 'HKD').amount, '');
assert.equal(quotationPrefill({ budget: 'HKD 13,000 + HKD 2,000 usage' }, 'HKD').amount, '');

const baseInput = {
  projectId: 'isolated-letasu-fixture', amount: 13000, currency: 'HKD', deliverable: prefill.deliverable,
  revisions: 2, placementMode: 'code_only', adPlacementDays: 7,
  paymentTerms: '50% deposit; remaining 50% within 30 days after publication',
  signerName: 'Renee Chan', paymentRecipient: 'CHAN YEUNG CHIM',
  paymentContact: 'tyeungchim@gmail.com',
};
const rules = { placement_fee_rate: 0.10, usage_six_months_rate: 0.20, usage_twelve_months_rate: 0.30 };
const base = calculateQuote(brief, baseInput, rules);
assert.equal(base.canIssue, true);
assert.equal(base.snapshot.total, 13000);
assert.equal(base.snapshot.placementFee, 0, 'Ad Code-only period must not be charged as managed ad spend');
assert.equal(base.snapshot.revisions, 2);
assert.equal(base.snapshot.paymentRecipient, 'CHAN YEUNG CHIM');
assert.equal(base.snapshot.paymentContact, 'tyeungchim@gmail.com');

const managed = calculateQuote(brief, { ...baseInput, placementMode: 'managed', adSpendAmount: 10000 }, rules);
assert.equal(managed.snapshot.placementFee, 1000, '10% placement handling is based on client ad spend, not collaboration fee');
assert.equal(managed.snapshot.total, 14000);
const sixMonths = calculateQuote(brief, { ...baseInput, placementMode: 'none', adPlacementDays: undefined, usageMonths: 6 }, rules);
assert.equal(sixMonths.snapshot.usageFee, 2600);
assert.equal(sixMonths.snapshot.total, 15600);
assert.equal(calculateQuote(brief, { ...baseInput, signerName: '' }, rules).canIssue, false);
assert.equal(calculateQuote(brief, { ...baseInput, paymentTerms: '' }, rules).canIssue, false);
assert.equal(calculateQuote(brief, { ...baseInput, placementMode: 'managed', adSpendAmount: 0 }, rules).canIssue, false);

const pdf = fs.readFileSync('src/app/api/quotations/[id]/pdf/route.ts', 'utf8');
assert.ok(pdf.includes('white-space:pre-line'));
assert.ok(pdf.includes('paymentContact'));
assert.ok(pdf.includes('No signature is applied automatically'));
assert.ok(pdf.includes("value.placementMode === 'managed'"));

console.log('PASS: isolated LE-TA-SU fixture preserves line items, 2 revisions, Ad Code/managed-placement distinction, usage add-ons, deposit terms, separate signer/payee/contact, and blocks unknown approval data.');
