// Render App Store screenshots (iPhone 6.5": 1242x2688) for each language.
//   node marketing/app-store-screenshots/render.mjs [en|zh ...]
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
const NAMES = ['01-collect', '02-search', '03-rate-reflect', '04-discover', '05-revisit', '06-share'];
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['en', 'zh'];

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: true, args: ['--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 1242, height: 2688, deviceScaleFactor: 1 });
for (const lang of langs) {
  const dir = path.join(HERE, 'out', lang === 'zh' ? 'zh-Hant' : 'en-US');
  fs.mkdirSync(dir, { recursive: true });
  for (let s = 1; s <= NAMES.length; s++) {
    await page.goto(`http://127.0.0.1:${server.address().port}/app-store-screenshots/slides.html?lang=${lang}&s=${s}`, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 });
    await page.screenshot({ path: path.join(dir, `${NAMES[s - 1]}.png`) });
  }
  console.log(lang, '->', dir);
}
await browser.close();
server.close();
