const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('node:assert/strict');
function load(path) { const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports }); return exports; }
const { recommendationMatch: match } = load('src/lib/topic-recommendations.ts');
const { rotateRecommendations: rotate } = load('src/lib/topic-rotation.ts');
const food = { id: 'food', title: '巴黎餐廳實測', summary: '親子家庭', category: '美食', tags: ['法國','餐廳'], content_format: 'short_video' };
const sport = { ...food, id: 'sport', title: '運動訓練', summary: '', category: '運動', tags: [] };
const dna = { primary_industry_code: 'food_beverage', preferred_formats: ['short_video'], content_styles: ['實測'], audience_summary: '親子家庭' };
assert.ok(match(food, dna, [], []).score > match(sport, dna, [], []).score);
assert.equal(match(sport, dna, [], []).relevant, false, 'format alone is not relevance');
assert.ok(match(food, null, [], [{ ...food, id: 'saved-food' }]).relevant, 'positive similarity');
assert.equal(match(food, null, [], []).relevant, false);
const items = [{ id: 'a', recommendation_score: 20 }, { id: 'b', recommendation_score: 18 }, { id: 'c', recommendation_score: 17 }, { id: 'bad', recommendation_score: 1 }];
let current = items, history = [];
for (let i = 0; i < 12; i++) {
 const last = current[0].id; history.push(last); current = rotate(items, history);
 assert.notEqual(current[0].id, last); assert.notEqual(current[0].id, 'bad');
 assert.equal(new Set(current.map(x => x.id)).size, items.length);
}
assert.equal(rotate([items[0]], ['a'])[0].id, 'a');
assert.equal(rotate([items[0], items[3]], ['a'])[0].id, 'a', 'never promote irrelevant candidate');
assert.equal(rotate([items[1], items[2]], ['b'])[0].id, 'c', 'rotation respects filtered pool');
assert.equal(fs.readFileSync('src/lib/topic-rotation.ts','utf8'), fs.readFileSync('/Users/tommytsang/Desktop/SOON/soon-idea-ios/src/lib/topic-rotation.ts','utf8'));
console.log('PASS DNA industry/style/audience/format, positive similarity, 12 refresh rotations, quality floor, single candidate, filtered pool, shared parity.');
