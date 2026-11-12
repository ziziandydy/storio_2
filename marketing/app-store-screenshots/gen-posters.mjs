// 產生「虛構作品」的海報／書封（2:3，600×900 JPG），App Store 素材一律只用這批，避免第三方影像被退件。
//   node marketing/app-store-screenshots/gen-posters.mjs
// 標題皆為虛構，不使用任何真實作品、演員或片商標誌。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../puppeteer-service/package.json'));
const puppeteer = require('puppeteer');
const OUT = path.join(HERE, 'fake');
fs.mkdirSync(OUT, { recursive: true });

// kind: movie | series | book；art: 圖形母題；a/b/c：配色
export const WORKS = [
  { id: 'movie_0', kind: 'movie', title: 'THE LAST<br>LIGHTHOUSE', tag: 'A FILM BY M. ARDEN', art: 'beam', a: '#0b1d33', b: '#27598f', c: '#f4d58d' },
  { id: 'movie_1', kind: 'movie', title: 'PAPER<br>MOONS', tag: 'COMING THIS SUMMER', art: 'moons', a: '#2b0f2e', b: '#8a3b6e', c: '#ffd9c0' },
  { id: 'movie_2', kind: 'movie', title: 'NEON<br>HARBOR', tag: 'ONE NIGHT. ONE CITY.', art: 'grid', a: '#07121f', b: '#0f7a8a', c: '#ff5d8f' },
  { id: 'movie_3', kind: 'movie', title: 'QUIET<br>ORBIT', tag: 'NOBODY CAN HEAR YOU', art: 'orbit', a: '#050510', b: '#2b2f77', c: '#9ad0ff' },
  { id: 'movie_4', kind: 'movie', title: 'SALT &<br>EMBER', tag: 'BASED ON A TRUE SILENCE', art: 'sun', a: '#2a0e05', b: '#b8461c', c: '#ffcf8b' },
  { id: 'movie_5', kind: 'movie', title: 'GLASS<br>SUMMER', tag: 'THE LONGEST AUGUST', art: 'rings', a: '#0e2a2a', b: '#3aa38c', c: '#f3f7d0' },
  { id: 'movie_6', kind: 'movie', title: 'NIGHT<br>SHIFT', tag: 'THE CITY NEVER CLOCKS OUT', art: 'grid', a: '#12062b', b: '#4b1fa8', c: '#ff7ad9' },
  { id: 'movie_7', kind: 'movie', title: 'THE<br>MAP<br>MAKER', tag: 'MAP THE UNMAPPED', art: 'beam', a: '#1a1408', b: '#7a5a1c', c: '#f0d9a0' },
  { id: 'series_0', kind: 'series', title: 'HOLLOW<br>CROWN<br>COUNTY', tag: 'SEASON 2', art: 'rings', a: '#0f1a12', b: '#3c6b46', c: '#d9e8c8' },
  { id: 'series_1', kind: 'series', title: 'THE TIDE<br>ARCHIVE', tag: 'NEW SERIES', art: 'beam', a: '#06182b', b: '#1f6aa5', c: '#bfe6ff' },
  { id: 'series_2', kind: 'series', title: 'NORTHLINE', tag: 'SEASON 4', art: 'orbit', a: '#10131a', b: '#44546a', c: '#e6edf5' },
  { id: 'series_3', kind: 'series', title: 'AFTERGLOW<br>SOCIETY', tag: 'SEASON 1', art: 'sun', a: '#2b0d1a', b: '#c2395f', c: '#ffd1a1' },
  { id: 'series_4', kind: 'series', title: 'PARALLEL<br>HOURS', tag: 'SEASON 3', art: 'grid', a: '#0a0a1f', b: '#3340c9', c: '#a8ffea' },
  { id: 'series_5', kind: 'series', title: 'CEDAR FALLS<br>DIARIES', tag: 'SEASON 6', art: 'moons', a: '#1d1209', b: '#8a5a2b', c: '#ffe3b8' },
  { id: 'series_6', kind: 'series', title: 'STATIC', tag: 'MINISERIES', art: 'grid', a: '#101010', b: '#555', c: '#f2f2f2' },
  { id: 'series_7', kind: 'series', title: 'THE WIRED<br>GARDEN', tag: 'SEASON 2', art: 'rings', a: '#08200f', b: '#1c8f4c', c: '#e1ff9a' },
  { id: 'book_0', kind: 'book', title: 'The Salt<br>Almanac', tag: 'A NOVEL', art: 'sun', a: '#f1e6cf', b: '#d9b77a', c: '#5a3b16', light: true },
  { id: 'book_1', kind: 'book', title: 'A Map of<br>Small Hours', tag: 'ESSAYS', art: 'moons', a: '#dfe8f0', b: '#9db7cf', c: '#14283d', light: true },
  { id: 'book_2', kind: 'book', title: 'Letters to<br>the Lighthouse', tag: 'A NOVEL', art: 'beam', a: '#10243a', b: '#2d5a86', c: '#f6e3a6' },
  { id: 'book_3', kind: 'book', title: 'Ember<br>& Ash', tag: 'POEMS', art: 'rings', a: '#2b1410', b: '#a63d24', c: '#ffd9b8' },
  { id: 'book_4', kind: 'book', title: 'The Quiet<br>Orchard', tag: 'A NOVEL', art: 'orbit', a: '#e8efd9', b: '#9bbf72', c: '#2c4a1a', light: true },
  { id: 'book_5', kind: 'book', title: 'Field Notes<br>for Rain', tag: 'NONFICTION', art: 'grid', a: '#e6e9ee', b: '#8d9bb0', c: '#1b2433', light: true },
];

const ART = {
  beam: (c, b) => `<div style="position:absolute;left:50%;top:-10%;width:900px;height:900px;margin-left:-450px;background:conic-gradient(from 160deg at 50% 0%,transparent 0 10deg,${c}66 20deg,transparent 40deg);filter:blur(6px)"></div><div style="position:absolute;left:50%;bottom:0;width:70px;height:420px;margin-left:-35px;background:${b};clip-path:polygon(25% 0,75% 0,100% 100%,0 100%)"></div>`,
  moons: (c) => [0, 1, 2].map((i) => `<div style="position:absolute;left:${90 + i * 150}px;top:${230 + (i % 2) * 120}px;width:${150 - i * 20}px;height:${150 - i * 20}px;border-radius:50%;background:${c};opacity:${0.95 - i * 0.2};box-shadow:inset -24px -10px 0 rgba(0,0,0,.18)"></div>`).join(''),
  grid: (c, b) => `<div style="position:absolute;inset:auto 0 0 0;height:50%;background:repeating-linear-gradient(90deg,${b}55 0 2px,transparent 2px 46px),repeating-linear-gradient(0deg,${b}55 0 2px,transparent 2px 46px);transform:perspective(500px) rotateX(55deg);transform-origin:bottom"></div><div style="position:absolute;left:50%;top:210px;width:210px;height:210px;margin-left:-105px;border-radius:50%;background:linear-gradient(${c},${b});box-shadow:0 0 90px ${c}88"></div>`,
  orbit: (c) => `<div style="position:absolute;left:50%;top:300px;width:420px;height:420px;margin:-210px 0 0 -210px;border:2px solid ${c}88;border-radius:50%"></div><div style="position:absolute;left:50%;top:300px;width:250px;height:250px;margin:-125px 0 0 -125px;border:2px solid ${c}55;border-radius:50%"></div><div style="position:absolute;left:calc(50% + 190px);top:262px;width:36px;height:36px;border-radius:50%;background:${c}"></div>`,
  sun: (c, b) => `<div style="position:absolute;left:50%;top:260px;width:340px;height:340px;margin-left:-170px;border-radius:50%;background:radial-gradient(circle at 40% 35%,${c},${b})"></div><div style="position:absolute;left:0;right:0;top:520px;height:6px;background:${c}55"></div><div style="position:absolute;left:0;right:0;top:545px;height:10px;background:${c}33"></div>`,
  rings: (c) => [0, 1, 2, 3].map((i) => `<div style="position:absolute;left:50%;top:300px;width:${130 + i * 100}px;height:${130 + i * 100}px;margin:${-(65 + i * 50)}px 0 0 ${-(65 + i * 50)}px;border:${3 - (i > 1 ? 1 : 0)}px solid ${c}${['ff', 'aa', '77', '44'][i]};border-radius:50%"></div>`).join(''),
};

const html = (w, textless = false) => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@500;700&family=Jost:wght@400;500&display=block" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}html,body{width:600px;height:900px;overflow:hidden}
#p{position:relative;width:600px;height:900px;overflow:hidden;background:linear-gradient(170deg,${w.a},${w.b});color:${w.light ? w.c : '#fff'};font-family:Jost,sans-serif}
.noise{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0,rgba(255,255,255,.12),transparent 60%),linear-gradient(transparent 55%,rgba(0,0,0,${w.light ? 0 : 0.55}))}
.title{position:absolute;left:44px;right:44px;bottom:${w.kind === 'book' ? 150 : 330}px;line-height:.95;text-align:${w.kind === 'book' ? 'center' : 'left'};
 font:${w.kind === 'book' ? '700 76px' : '400 92px'} ${w.kind === 'book' ? "'Cormorant Garamond',serif" : "'Bebas Neue',sans-serif"};letter-spacing:${w.kind === 'book' ? '-.01em' : '.02em'};text-shadow:${w.light ? 'none' : '0 6px 30px rgba(0,0,0,.5)'}}
.tag{position:absolute;left:44px;right:44px;bottom:${w.kind === 'book' ? 56 : 270}px;font:500 22px Jost;letter-spacing:.34em;opacity:.85;text-align:${w.kind === 'book' ? 'center' : 'left'}}
.top{position:absolute;left:44px;top:44px;font:500 20px Jost;letter-spacing:.4em;opacity:.7}
${w.kind === 'book' ? '#p::after{content:"";position:absolute;left:0;top:0;bottom:0;width:22px;background:rgba(0,0,0,.14)}' : ''}
</style>
<div id="p">${ART[w.art](w.c, w.b)}<div class="noise" style="${textless ? 'background:radial-gradient(90% 60% at 50% 30%,rgba(255,255,255,.22),transparent 70%)' : ''}"></div><div class="top">${textless ? '' : w.kind === 'series' ? 'ORIGINAL SERIES' : w.kind === 'book' ? '' : 'A STORIO PICTURE'}</div>${textless ? '' : `<div class="title">${w.title}</div><div class="tag">${w.tag}</div>`}</div>`;

const browser = await puppeteer.launch({ headless: true, args: ['--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 600, height: 900, deviceScaleFactor: 1 });
for (const w of WORKS) {
  await page.setContent(html(w), { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
  await page.screenshot({ path: path.join(OUT, `${w.id}.jpg`), type: 'jpeg', quality: 92 });
  // 詳情頁背景（無文字版）
  await page.setContent(html(w, true), { waitUntil: 'load', timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, `bd_${w.id}.jpg`), type: 'jpeg', quality: 90 });
}
await browser.close();
console.log('posters ->', OUT, WORKS.length);
