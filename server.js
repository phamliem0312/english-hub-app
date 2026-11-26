// Production: phục vụ dist/ và /api/messages trong một process. Chạy: npm run build && npm start
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { handleAI } from './server/ai-proxy.js';

const DIST = join(import.meta.dirname, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // đặt HOST=0.0.0.0 khi deploy

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/api/messages') return handleAI(req, res);
  const file = join(DIST, normalize(path === '/' ? '/index.html' : path));
  if (!file.startsWith(DIST + sep)) { res.statusCode = 403; return res.end(); }
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, HOST, () => console.log(`English Hub: http://${HOST}:${PORT}`));
