import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** GIF 檔頭的 NETSCAPE 擴充區塊：... "NETSCAPE2.0" 0x03 0x01 <loop 低位元組> <loop 高位元組> 0x00；loop = 0 表示無限循環。 */
function loopCount(file: string): number {
  const bytes = readFileSync(join(process.cwd(), 'public/image', file));
  const marker = Buffer.from('NETSCAPE2.0');
  const i = bytes.indexOf(marker);
  if (i === -1) return -1; // 沒有循環區塊：只播一次
  const at = i + marker.length;
  return bytes[at + 2] | (bytes[at + 3] << 8);
}

describe('Recap 最後一頁的載入動畫素材', () => {
  it('loading-loop.gif 是無限循環（原本的 loading.gif 只播一兩輪就停住）', () => {
    expect(loopCount('loading-loop.gif')).toBe(0);
    expect(loopCount('loading.gif')).not.toBe(0);
  });

  it('兩個檔案的畫面內容相同，只有循環次數不同（長度相同）', () => {
    const a = readFileSync(join(process.cwd(), 'public/image/loading.gif'));
    const b = readFileSync(join(process.cwd(), 'public/image/loading-loop.gif'));
    expect(b.length).toBe(a.length);
    let differing = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differing++;
    expect(differing).toBeLessThanOrEqual(2);
  });
});
