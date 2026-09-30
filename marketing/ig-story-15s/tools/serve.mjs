// Shared: serve the marketing folder over localhost and open a page in headless Chromium.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(ROOT, '../../puppeteer-service/package.json'));
const puppeteer = require('puppeteer');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

export async function openPage(relPath, viewport) {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) console.error('[console]', m.text()); });
  await page.setViewport({ deviceScaleFactor: 1, ...viewport });
  await page.goto(`http://127.0.0.1:${server.address().port}/${relPath}`, { waitUntil: 'networkidle0' });
  const close = async () => { await browser.close(); server.close(); };
  return { page, close };
}
