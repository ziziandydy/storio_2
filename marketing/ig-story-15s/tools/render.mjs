// Frame-accurate renderer.
//   node tools/render.mjs stills [--dir variants/x] 0.5 2.1 ...   -> out/<name>/stills/*.png
//   node tools/render.mjs frames [--dir variants/x] [--sub 4]     -> out/<name>/frames/*.jpg
// --dir defaults to "." (the original V1 composition at the folder root).
import fs from 'node:fs';
import path from 'node:path';
import { openPage, ROOT } from './serve.mjs';

const argv = process.argv.slice(2);
const mode = argv[0] || 'stills';
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DIR = opt('--dir', '.');
const SUB = Number(opt('--sub', 4));
const times = argv.slice(1).filter((x, i, a) => !x.startsWith('--') && !(a[i - 1] || '').startsWith('--'));
const NAME = DIR === '.' ? 'v1' : path.basename(DIR);
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, DIR, 'timing.json'), 'utf8'));

const { page, close } = await openPage(path.posix.join(DIR, 'index.html'), { width: timing.width, height: timing.height });
await page.waitForFunction('window.__ready === true', { timeout: 60000 });

const shot = async (t, file, type) => {
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.screenshot({ path: file, type, ...(type === 'jpeg' ? { quality: 93 } : {}), optimizeForSpeed: true });
};

if (mode === 'stills') {
  const dir = path.join(ROOT, 'out', NAME, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const s of times) { await shot(Number(s), path.join(dir, `t${Number(s).toFixed(3)}.png`), 'png'); }
  console.log(`stills: ${times.length} -> ${dir}`);
} else {
  const dir = path.join(ROOT, 'out', NAME, 'frames');
  const resume = argv.includes('--resume');
  if (!resume) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const rate = timing.fps * SUB, total = Math.round(timing.duration * rate), t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const file = path.join(dir, `${String(i).padStart(5, '0')}.jpg`);
    if (resume && fs.existsSync(file) && fs.statSync(file).size > 0) continue;
    await shot(i / rate, file, 'jpeg');
    if (i % 300 === 0) console.log(`${NAME} frame ${i}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  console.log(`${NAME} done ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await close();
