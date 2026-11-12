// 用 headless Chrome 開「真實 App」（Next dev，後端指向 mock-api.py 的虛構資料），以 iPhone 視窗截圖。
//   node marketing/app-store-screenshots/capture-app.mjs [en|zh] [名稱...]
// 輸出：marketing/app-store-screenshots/out/app/<lang>/<name>.png（1170×2532，3x）
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../puppeteer-service/package.json'));
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:3012';
const lang = process.argv[2] === 'zh' ? 'zh' : 'en';
const only = process.argv.slice(3);
const OUT = path.join(HERE, 'out', 'app', lang);
fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (page, text, nth = 0) =>
  page.evaluate((t, n) => {
    const opts = t.toLowerCase().split('|');
    const els = [...document.querySelectorAll('button, a, [role=button]')].filter((b) => opts.includes((b.textContent || '').trim().toLowerCase()));
    if (els[n]) { els[n].click(); return true; }
    return false;
  }, text, nth);
// 訪客的「Welcome to Storio」登入提示：關掉它
const dismissWelcome = async (page) => {
  const there = await page.evaluate(() => /Welcome to Storio|歡迎來到 Storio/.test(document.body.innerText));
  if (there) { await page.mouse.click(329, 176); await wait(800); }
};
const _unusedDismiss = (page) =>
  page.evaluate(() => {
    const h = [...document.querySelectorAll('h1,h2,h3,div')].find((e) => e.children.length === 0 && /Welcome to Storio|歡迎來到 Storio/.test(e.textContent || ''));
    if (!h) return false;
    let n = h.parentElement;
    for (let i = 0; i < 4 && n; i++, n = n.parentElement) {
      const b = [...n.querySelectorAll('button')].find((x) => !(x.textContent || '').trim());
      if (b) { b.click(); return true; }
    }
    return false;
  });
const tapRight = (page, times) => (async () => { for (let i = 0; i < times; i++) { await page.mouse.click(350, 420); await wait(400); } })();

// 每個畫面：路徑＋進場後的操作，再等待 settle 毫秒
const SCREENS = {
  home: { url: '/', settle: 7000, act: async (p) => { await dismissWelcome(p); await wait(1200); } },
  collection: { url: '/collection', settle: 2500, act: dismissWelcome },
  search: { url: '/search?q=the&filter=movie', settle: 2500, act: dismissWelcome },
  details: { url: '/details?type=movie&id=movie_0', settle: 3000 },
  details_scroll: { url: '/details?type=movie&id=movie_0', settle: 3000, act: async (p) => { await p.evaluate(() => { document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY !== 'visible') e.scrollTop = 420; }); window.scrollTo(0, 420); }); await wait(1500); } },
  details_tv: { url: '/details?type=tv&id=series_0', settle: 3000 },
  calendar: { url: '/collection', settle: 2500, act: async (p) => { await dismissWelcome(p); await p.mouse.click(358, 32); await wait(4500); } },
  search_books: { url: '/search?q=the&filter=book', settle: 2500, act: async (p) => { await dismissWelcome(p); await clickText(p, 'Books|書籍', 0); await wait(2500); } },
  profile: { url: '/profile', settle: 2500, act: dismissWelcome },
  add_movie: {
    url: '/search?q=Night%20Shift&filter=movie', settle: 2500,
    act: async (p) => {
      await dismissWelcome(p); await clickText(p, 'Add|加入', 0); await wait(1800);
      await p.mouse.click(285, 414); await wait(300); // 9 星
      await p.click('textarea'); await p.keyboard.type(lang === 'zh' ? '一週內看了兩次，每次都有新的感動。' : 'Watched it twice in one week.', { delay: 15 });
      await wait(600);
    },
  },
  add_tv: { url: '/search?q=Hollow&filter=tv', settle: 2500, act: async (p) => { await dismissWelcome(p); await clickText(p, 'Add|加入', 0); await wait(2200); } },
  recap_0: { url: '/recap?year=2026', settle: 3000 },
  recap_total: { url: '/recap?year=2026', settle: 2500, act: (p) => tapRight(p, 1) },
  recap_eras: { url: '/recap?year=2026', settle: 2500, act: (p) => tapRight(p, 6) },
  recap_title: { url: '/recap?year=2026', settle: 2500, act: (p) => tapRight(p, 11) },
  recap_share: { url: '/recap?year=2026', settle: 2500, act: async (p) => { await clickText(p, 'Share|分享'); await wait(2000); } },
};

const browser = await puppeteer.launch({ headless: true, args: ['--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument((language) => {
  localStorage.setItem('E2E_TEST', 'true');
  localStorage.setItem('storio-settings-storage', JSON.stringify({ state: { language: language === 'zh' ? 'zh-TW' : 'en-US' }, version: 0 }));
  localStorage.setItem('storio_onboarding_seen', 'true');
}, lang);

for (const [name, s] of Object.entries(SCREENS)) {
  if (only.length && !only.includes(name)) continue;
  await page.goto(BASE + s.url, { waitUntil: 'load', timeout: 90000 });
  await new Promise((r) => setTimeout(r, s.settle));
  if (s.act) await s.act(page);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(name);
}
await browser.close();
