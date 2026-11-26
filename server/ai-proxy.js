// Proxy Claude cho trình duyệt: giữ API key ở server, chỉ nhận đúng dạng request mà app dùng.
import Anthropic from '@anthropic-ai/sdk';

try { process.loadEnvFile(); } catch { /* không có .env: dùng biến môi trường sẵn có */ }

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';
const MAX_BODY = 20_000; // prompt của app chỉ vài KB
let client;

export async function handleAI(req, res) {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });

  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) return send(413, { error: 'Request quá lớn' });
  }
  let messages;
  try { ({ messages } = JSON.parse(raw)); } catch { return send(400, { error: 'JSON không hợp lệ' }); }
  // Model và max_tokens do server quyết, client chỉ gửi được tin nhắn văn bản của user.
  if (!Array.isArray(messages) || !messages.length || messages.some((m) => m?.role !== 'user' || typeof m.content !== 'string')) {
    return send(400, { error: 'messages phải là các tin nhắn văn bản của user' });
  }

  try {
    client ??= new Anthropic(); // đọc ANTHROPIC_API_KEY
    const msg = await client.messages.create({ model: MODEL, max_tokens: 4000, messages });
    if (msg.stop_reason !== 'end_turn') return send(502, { error: `AI dừng bất thường: ${msg.stop_reason}` });
    send(200, { content: msg.content });
  } catch (e) {
    send(e instanceof Anthropic.APIError && e.status ? e.status : 500, { error: e.message });
  }
}
