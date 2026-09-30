import assert from 'node:assert/strict';
import { getAnthropic } from '../src/lib/ai/anthropic';
import { researchCommand } from '../src/lib/command-research';

async function main() {
  process.env.ANTHROPIC_API_KEY = 'test-only-no-network';
  const client = getAnthropic()!;
  const original = client.messages.create;
  const text = (value: unknown) => ({ type: 'text', text: JSON.stringify(value) });
  const intent = { location: '香港中環', goal: '附近美食', format: 'Reel', on_camera: '' };
  let responses: unknown[] = [];
  let calls = 0;
  client.messages.create = (async () => { calls++; assert.ok(responses.length); return responses.shift(); }) as unknown as typeof original;
  try {
    responses = [{ content: [text(intent)] }, { content: [
      { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://example.com/central' }] },
      text({ places: [
        { name: '測試店', address: '香港中環測試地址', fact: '提供麵食', url: 'https://example.com/central' },
        { name: '虛構來源', address: '中環', fact: '美食', url: 'https://invented.example/test' },
      ] }),
    ] }];
    const grounded = await researchCommand('我在香港中環，想拍附近美食 Reel', {});
    assert.equal(grounded.evidence.length, 1);
    assert.equal(grounded.evidence[0].id, 'web-0');
    assert.equal(grounded.intent.on_camera, '');

    responses = [{ content: [text(intent)] }, { content: [text({ places: [{ name: '未搜尋資料', address: '中環', fact: '美食', url: 'https://example.com/central' }] })] }];
    assert.deepEqual((await researchCommand('中環美食', {})).evidence, []);

    responses = [{ content: [text(intent)] }, { content: [{ type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } }, text({ places: [] })] }];
    assert.deepEqual((await researchCommand('中環美食', {})).evidence, []);

    const before = calls;
    responses = [{ content: [text({ ...intent, location: '' })] }];
    assert.equal((await researchCommand('推薦題材', {})).searched, false);
    assert.equal(calls, before + 1);
    console.log('PASS: source allowlist, no-search grounding, search error, no-location branch');
  } finally { client.messages.create = original; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
