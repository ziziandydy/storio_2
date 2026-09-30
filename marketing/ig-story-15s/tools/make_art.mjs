// Export every .art element in art/art.html to art/out/<name>.jpg (+ a small thumb for recap payloads).
import fs from 'node:fs';
import path from 'node:path';
import { openPage, ROOT } from './serve.mjs';

const out = path.join(ROOT, 'art/out');
fs.mkdirSync(out, { recursive: true });
const { page, close } = await openPage('art/art.html', { width: 3600, height: 4000 });
await page.evaluate(() => document.fonts.ready);
const handles = await page.$$('.art');
for (const h of handles) {
  const name = await h.evaluate((el) => el.dataset.name);
  await h.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 92 });
  console.log(name);
}
await close();
