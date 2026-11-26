import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAI } from './ai-proxy.js';

// Các case dưới đều bị chặn trước khi gọi API, nên không tốn tiền và không cần key.
async function call(method, body) {
  const req = { method, async *[Symbol.asyncIterator]() { if (body !== undefined) yield body; } };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { this.body = JSON.parse(s); } };
  await handleAI(req, res);
  return res;
}

test('chỉ nhận POST', async () => {
  assert.equal((await call('GET')).statusCode, 405);
});

test('chặn JSON hỏng và body quá lớn', async () => {
  assert.equal((await call('POST', '{oops')).statusCode, 400);
  assert.equal((await call('POST', 'x'.repeat(20_001))).statusCode, 413);
});

test('chỉ cho tin nhắn văn bản của user (không chèn assistant/system, không gửi block lạ)', async () => {
  for (const messages of [undefined, [], [{ role: 'assistant', content: 'hi' }], [{ role: 'user', content: [{ type: 'image' }] }], [null]]) {
    const r = await call('POST', JSON.stringify({ messages }));
    assert.equal(r.statusCode, 400, JSON.stringify(messages));
  }
});
