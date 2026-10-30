// Render the App Store 16:9 creative asset (5244x2950 PNG, no transparency) for each language.
//   node marketing/app-store-screenshots/render-banner.mjs [en|zh ...] [--guide]
// --guide 另存一張疊上 21:9（頁首）與 3:2（搜尋結果）裁切框的檢查圖，不可上傳。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(path.resolve(ROOT, '../puppeteer-service/package.json'));
const puppeteer = require('puppeteer');
const MIME = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg' };
const args = process.argv.slice(2);
const guide = args.includes('--guide');
const langs = args.filter((a) => !a.startsWith('--'));

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: true, args: ['--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 2622, height: 1475, deviceScaleFactor: 2 });
const dir = path.join(HERE, 'out', 'creative-asset');
fs.mkdirSync(dir, { recursive: true });
for (const lang of langs.length ? langs : ['en', 'zh']) {
  const name = lang === 'zh' ? 'zh-Hant' : 'en-US';
  const q = `lang=${lang}${guide ? '&guide=1' : ''}`;
  await page.goto(`http://127.0.0.1:${server.address().port}/app-store-screenshots/banner.html?${q}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  const out = path.join(dir, `header-16x9-${name}${guide ? '-guide' : ''}.png`);
  await page.screenshot({ path: out, omitBackground: false });
  console.log(lang, '->', out);
}
await browser.close();
server.close();
