// 轉出 App Store 截圖（v2，9 張）：iPhone 動態島中型、iPhone Duo 外／內螢幕，中英各一套。
//   node marketing/app-store-screenshots/render-store.mjs [en|zh] [size=iphone|duo-outer|duo-inner] [slide...]
// 前置：mock-api.py（8011）＋ Next dev（3012）已啟動，並已跑過 capture-app.mjs（out/app/<lang>/*.png）
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
const SIZES = { iphone: [1206, 2622], 'duo-outer': [1398, 2034], 'duo-inner': [2007, 2853] };
const [langArg, sizeArg, ...slideArgs] = process.argv.slice(2);
const langs = langArg ? [langArg] : ['en', 'zh'];
const sizes = sizeArg && SIZES[sizeArg] ? [sizeArg] : Object.keys(SIZES);
const slides = slideArgs.length ? slideArgs.map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9];

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: true, args: ['--force-color-profile=srgb'] });
const page = await browser.newPage();
for (const size of sizes) {
  const [w, h] = SIZES[size];
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  for (const lang of langs) {
    const dir = path.join(HERE, 'out', 'store', size, lang === 'zh' ? 'zh-Hant' : 'en-US');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of slides) {
      await page.goto(`http://127.0.0.1:${server.address().port}/app-store-screenshots/store.html?lang=${lang}&s=${s}&w=${w}&h=${h}`, { waitUntil: 'load', timeout: 90000 });
      await page.waitForFunction('window.__ready === true', { timeout: 60000 });
      await page.screenshot({ path: path.join(dir, `${String(s).padStart(2, '0')}.png`) });
    }
    console.log(size, lang, '->', dir);
  }
}
await browser.close();
server.close();
