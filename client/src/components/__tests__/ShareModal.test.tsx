// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { flush, stubObjectUrls, setWebShare, spyAnchorDownloads } from './shareTestUtils';

// ── 模組替身 ───────────────────────────────────────────────
const m = vi.hoisted(() => ({
  isNative: vi.fn(() => false),
  health: vi.fn(),
  render: vi.fn(),
  writeFile: vi.fn(),
  nativeShare: vi.fn(),
  base64: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, drag, dragConstraints, dragElastic, onDragEnd, ...rest }: Record<string, unknown>) => rest;
  const make = (Tag: string) => {
    const Mock = ({ children, ...p }: { children?: React.ReactNode } & Record<string, unknown>) => React.createElement(Tag, strip(p), children);
    Mock.displayName = `motion.${Tag}`;
    return Mock;
  };
  const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  AnimatePresence.displayName = 'AnimatePresence';
  return { motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }), AnimatePresence };
});
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => m.isNative() } }));
vi.mock('@capacitor/share', () => ({ Share: { share: (...a: unknown[]) => m.nativeShare(...a) } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: (...a: unknown[]) => m.writeFile(...a) },
  Directory: { Cache: 'CACHE' },
}));
vi.mock('@/lib/share-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/share-api')>('@/lib/share-api');
  return {
    ...actual,
    getRenderServiceHealth: () => m.health(),
    renderShareImage: (...a: unknown[]) => m.render(...a),
    blobToBase64: (...a: unknown[]) => m.base64(...a),
  };
});
vi.mock('@/components/share/MemoryCardTemplate', () => ({
  default: (p: { title: string; selectedTemplate: string }) => <div data-testid="preview-card" data-template={p.selectedTemplate}>{p.title}</div>,
}));

import ShareModal from '@/components/ShareModal';
import { invalidateCache } from '@/hooks/useProgressiveRenderQueue';
import { useSettingsStore } from '@/store/settingsStore';
import { translations } from '@/i18n/locales';

const T = translations['en-US'];
const MOVIE = { title: 'Dune', year: 2021, posterPath: '/p.jpg', rating: 4.5, reflection: 'Great', type: 'movie' as const };
const BOOK = { title: 'Walden', year: 1854, posterPath: '/w.jpg', rating: 5, type: 'book', page_count: 300 };

const baseProps = { isOpen: true, onClose: vi.fn(), title: 'Share', fileName: 'storio-dune' };
const ui = (over: Partial<React.ComponentProps<typeof ShareModal>> = {}) => <ShareModal {...baseProps} item={MOVIE} {...over} />;
const mount = async (over: Partial<React.ComponentProps<typeof ShareModal>> = {}) => {
  const r = render(ui(over));
  await flush(50);
  return r;
};
const renderedTemplates = () => m.render.mock.calls.map((c) => c[0].settings.selectedTemplate);
const btn = (name: RegExp | string) => screen.getByRole('button', { name });
const queryBtn = (name: RegExp | string) => screen.queryByRole('button', { name });

let revoked: string[];

beforeEach(() => {
  vi.useFakeTimers();
  revoked = stubObjectUrls();
  m.isNative.mockReturnValue(false);
  m.health.mockReset().mockResolvedValue(true);
  m.render.mockReset().mockImplementation(async (p: { settings: { selectedTemplate: string } }) => Object.assign(new Blob([p.settings.selectedTemplate]), { tag: p.settings.selectedTemplate }));
  m.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/out.png' });
  m.nativeShare.mockReset().mockResolvedValue(undefined);
  m.base64.mockReset().mockResolvedValue('BASE64DATA');
  baseProps.onClose = vi.fn();
  useSettingsStore.setState({ language: 'en-US' });
  setWebShare({});
  invalidateCache();
  revoked.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ShareModal — 開關與服務狀態', () => {
  it('isOpen=false 不渲染任何內容也不呼叫服務', async () => {
    await mount({ isOpen: false });
    expect(screen.queryByRole('button')).toBeNull();
    expect(m.health).not.toHaveBeenCalled();
    expect(m.render).not.toHaveBeenCalled();
  });

  it('點關閉鈕與背景都會呼叫 onClose', async () => {
    const { container } = await mount();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);                      // 右上角 X
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelector('.bg-black\\/95') as Element);
    expect(baseProps.onClose).toHaveBeenCalledTimes(2);
  });

  it('服務冷啟動中顯示等待畫面且不發渲染請求，服務就緒後才開始渲染', async () => {
    m.health.mockResolvedValue(false);
    await mount();
    expect(screen.getByText('圖片服務準備中...')).toBeTruthy();
    expect(m.render).not.toHaveBeenCalled();

    m.health.mockResolvedValue(true);
    await flush(3100);                                // 下一次 3s 重試
    expect(screen.queryByText('圖片服務準備中...')).toBeNull();
    expect(m.render).toHaveBeenCalled();
  });

  it('60 秒仍未就緒顯示「服務暫時無法使用」，按重試後可恢復', async () => {
    m.health.mockResolvedValue(false);
    await mount();
    await flush(61000);
    expect(screen.getByText('服務暫時無法使用')).toBeTruthy();
    expect(m.render).not.toHaveBeenCalled();

    m.health.mockResolvedValue(true);
    fireEvent.click(btn(/稍後再試/));
    await flush(100);
    expect(screen.queryByText('服務暫時無法使用')).toBeNull();
    expect(m.render).toHaveBeenCalled();
  });

  it('關閉 Modal 會清空快取並 revoke 所有 objectUrl', async () => {
    const { rerender } = await mount();
    await flush(200);
    expect(m.render).toHaveBeenCalled();
    revoked.length = 0;
    rerender(ui({ isOpen: false }));
    await flush(50);
    expect(revoked.length).toBeGreaterThan(0);
  });
});

describe('ShareModal — 單一 Storio：即時渲染', () => {
  it('渲染 payload 帶入作品資料與目前設定', async () => {
    await mount();
    expect(m.render.mock.calls[0][0]).toEqual({
      template: 'memory-card',
      item: { title: 'Dune', year: 2021, posterPath: '/p.jpg', rating: 4.5, reflection: 'Great', type: 'movie', page_count: undefined },
      settings: { aspectRatio: '9:16', showTitle: true, showRating: true, showReflection: true, selectedTemplate: 'default' },
    });
  });

  it('沒有 poster 時使用預設海報路徑', async () => {
    await mount({ item: { ...MOVIE, posterPath: undefined as unknown as string } });
    expect(m.render.mock.calls[0][0].item.posterPath).toBe('/image/defaultMoviePoster.svg');
  });

  it('渲染完成前顯示 React 預覽，完成後換成 PNG <img>', async () => {
    let release!: (b: Blob) => void;
    m.render.mockImplementationOnce(() => new Promise<Blob>((r) => { release = r; }));
    await mount();
    expect(screen.getByTestId('preview-card').getAttribute('data-template')).toBe('default');
    expect(screen.queryByRole('img')).toBeNull();

    await act(async () => { release(new Blob(['png'])); });
    await flush(50);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toMatch(/^blob:mock-/);
    expect(img.alt).toBe('Share');
    expect(screen.queryByTestId('preview-card')).toBeNull();
  });

  it('電影只提供 Default / Pure / Ticket / Retro TV，並只渲染這四種', async () => {
    await mount();
    await flush(300);
    for (const label of [T.shareModal.templates.default, T.shareModal.templates.pure, T.shareModal.templates.ticket, T.shareModal.templates.retroTv]) {
      expect(btn(new RegExp(label))).toBeTruthy();
    }
    expect(queryBtn(new RegExp(T.shareModal.templates.shelf))).toBeNull();
    expect(queryBtn(new RegExp(T.shareModal.templates.desk))).toBeNull();
    expect(renderedTemplates().sort()).toEqual(['default', 'pure', 'ticket', 'tv']);
  });

  it('書籍只提供 Default / Pure / Shelf / Desk，並只渲染這四種', async () => {
    await mount({ item: BOOK });
    await flush(300);
    expect(queryBtn(new RegExp(T.shareModal.templates.ticket))).toBeNull();
    expect(queryBtn(new RegExp(T.shareModal.templates.retroTv))).toBeNull();
    expect(btn(new RegExp(T.shareModal.templates.shelf))).toBeTruthy();
    expect(renderedTemplates().sort()).toEqual(['3d', 'default', 'desk', 'pure']);
    expect(m.render.mock.calls[0][0].item.page_count).toBe(300);
  });

  it('切換模板：已渲染好的立即顯示，並以該模板為目前選取', async () => {
    await mount();
    await flush(300);
    fireEvent.click(btn(new RegExp(T.shareModal.templates.ticket)));
    await flush(50);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toMatch(/^blob:/);
  });

  it('切換到尚未渲染的模板會優先渲染它（即使別的模板正在渲染）', async () => {
    let release!: (b: Blob) => void;
    m.render.mockImplementationOnce(() => new Promise<Blob>((r) => { release = r; }));
    await mount();                                    // default 渲染中
    fireEvent.click(btn(new RegExp(T.shareModal.templates.retroTv)));
    await act(async () => { release(new Blob(['x'])); });
    await flush(300);
    expect(renderedTemplates()[1]).toBe('tv');
    expect(renderedTemplates().sort()).toEqual(['default', 'pure', 'ticket', 'tv']);
  });

  it.each([
    ['rating', T.shareModal.toggles.rating, 'showRating'],
    ['title', T.shareModal.toggles.title, 'showTitle'],
    ['reflection', T.shareModal.toggles.note, 'showReflection'],
  ])('切換「%s」開關：1.5s debounce 後以新設定重新渲染', async (_id, label, key) => {
    await mount();
    await flush(300);
    m.render.mockClear();
    fireEvent.click(btn(new RegExp(`^${label}$`)));
    await flush(1000);
    expect(m.render).not.toHaveBeenCalled();
    await flush(700);
    expect(m.render).toHaveBeenCalled();
    expect(m.render.mock.calls[0][0].settings[key]).toBe(false);
  });

  it('回歸：開啟後不會在 1.5s 後把已渲染好的圖作廢再重跑', async () => {
    await mount();
    await flush(300);
    const first = m.render.mock.calls.length;
    revoked.length = 0;
    await flush(5000);
    expect(m.render.mock.calls.length).toBe(first);
    expect(revoked).toEqual([]);
  });

  it('渲染失敗時按鈕維持「請稍候」，不會誤報成功', async () => {
    m.render.mockRejectedValue(new Error('puppeteer down'));
    await mount();
    await flush(300);
    expect(screen.getByText(/請稍候/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('回歸：快取過期（>5 分鐘）後按分享會重新渲染，而不是毫無反應', async () => {
    m.isNative.mockReturnValue(true);
    await mount();
    await flush(300);
    await flush(5 * 60 * 1000 + 2000);
    m.render.mockClear();
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(300);
    expect(m.render).toHaveBeenCalled();
    expect(m.nativeShare).not.toHaveBeenCalled();     // 這次點擊只負責補圖，不開空的分享面板
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(m.nativeShare).toHaveBeenCalledTimes(1);   // 圖補好後再按即可分享
  });

  it('沒有 item（傳入自訂 template）時直接顯示該 template，且不發渲染請求', async () => {
    await mount({ item: undefined, template: <div data-testid="custom-tpl">custom</div> });
    expect(screen.getByTestId('custom-tpl')).toBeTruthy();
    expect(screen.getByText(T.shareModal.readyToShare)).toBeTruthy();
    expect(m.render).not.toHaveBeenCalled();
    expect((screen.getAllByRole('button').find((b) => b.className.includes('bg-accent-gold') && b.textContent?.includes('Download')) as HTMLButtonElement | undefined)?.disabled ?? true).toBe(true);
  });
});

describe('ShareModal — 原生 App（iOS / Android）', () => {
  beforeEach(() => m.isNative.mockReturnValue(true));

  it('只有一顆「Share / Download」按鈕，沒有 Download / Saved', async () => {
    await mount();
    await flush(300);
    expect(btn(T.shareModal.shareOrSave)).toBeTruthy();
    expect(queryBtn(new RegExp(`^${T.shareModal.download}$`))).toBeNull();
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
  });

  it('圖片尚未就緒時按鈕 disabled 並顯示「請稍候」', async () => {
    m.render.mockImplementation(() => new Promise(() => {}));
    await mount();
    const b = screen.getByText(/請稍候/).closest('button') as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    fireEvent.click(b);
    expect(m.writeFile).not.toHaveBeenCalled();
    expect(m.nativeShare).not.toHaveBeenCalled();
  });

  it('點擊：先把 PNG 寫進 Cache，再以檔案 URI 開啟系統分享面板', async () => {
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);

    expect(m.writeFile).toHaveBeenCalledTimes(1);
    const w = m.writeFile.mock.calls[0][0];
    expect(w.path).toMatch(/^storio-dune_\d+\.png$/);
    expect(w.data).toBe('BASE64DATA');
    expect(w.directory).toBe('CACHE');

    expect(m.nativeShare).toHaveBeenCalledTimes(1);
    expect(m.nativeShare.mock.calls[0][0]).toEqual({
      title: 'Share',
      text: `${T.details.shareMessage} ${window.location.origin}`,
      url: 'file:///cache/out.png',
    });
    expect(m.writeFile.mock.invocationCallOrder[0]).toBeLessThan(m.nativeShare.mock.invocationCallOrder[0]);
  });

  it('回歸：原生平台不使用 <a download>（WKWebView 下載是無效的），也不顯示 Saved', async () => {
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(downloads).toEqual([]);
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
  });

  it('分享面板失敗 / 取消時不顯示 Saved、不下載，按鈕恢復可再按', async () => {
    m.nativeShare.mockRejectedValueOnce(new Error('Share canceled'));
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(downloads).toEqual([]);
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
    expect((btn(T.shareModal.shareOrSave) as HTMLButtonElement).disabled).toBe(false);
  });

  it('寫檔失敗時不會呼叫分享面板', async () => {
    m.writeFile.mockRejectedValueOnce(new Error('disk full'));
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(m.nativeShare).not.toHaveBeenCalled();
    expect((btn(T.shareModal.shareOrSave) as HTMLButtonElement).disabled).toBe(false);
  });

  it('分享的是目前選取模板的圖', async () => {
    await mount();
    await flush(300);
    fireEvent.click(btn(new RegExp(T.shareModal.templates.pure)));
    await flush(50);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(m.writeFile).toHaveBeenCalledTimes(1);
    expect((m.base64.mock.calls[0][0] as Blob & { tag: string }).tag).toBe('pure');
  });
});

describe('ShareModal — 網頁版', () => {
  it('支援 Web Share（含 files）時以 File 分享，不走下載', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setWebShare({ share, canShare: () => true });
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0][0];
    expect(arg.files[0]).toBeInstanceOf(File);
    expect(arg.files[0].name).toBe('storio-dune.png');
    expect(arg.files[0].type).toBe('image/png');
    expect(downloads).toEqual([]);
  });

  it('Web Share 不支援檔案時退回 <a download> 並顯示 Saved', async () => {
    setWebShare({ share: vi.fn(), canShare: () => false });
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(downloads.map((d) => d.download)).toEqual(['storio-dune.png']);
    expect(screen.queryByText(T.shareModal.saved)).not.toBeNull();
  });

  it('Web Share 丟出錯誤時退回下載', async () => {
    setWebShare({ share: vi.fn().mockRejectedValue(new Error('AbortError')), canShare: () => true });
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(downloads.map((d) => d.download)).toEqual(['storio-dune.png']);
  });

  it('完全不支援分享（桌面瀏覽器）：顯示單一 Download 鈕，點擊下載並短暫顯示 Saved', async () => {
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    expect(queryBtn(T.shareModal.shareOrSave)).toBeNull();
    await act(async () => { fireEvent.click(btn(new RegExp(T.shareModal.download))); });
    expect(downloads.map((d) => d.download)).toEqual(['storio-dune.png']);
    expect(screen.getByText(T.shareModal.saved)).toBeTruthy();
    await flush(2100);
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
    expect(btn(new RegExp(T.shareModal.download))).toBeTruthy();
  });

  it('桌面版：圖片未就緒時 Download 為 disabled 且不會假裝已儲存', async () => {
    m.render.mockImplementation(() => new Promise(() => {}));
    const { downloads } = spyAnchorDownloads();
    await mount();
    const b = screen.getByText(/請稍候/).closest('button') as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    fireEvent.click(b);
    expect(downloads).toEqual([]);
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
  });
});

describe('ShareModal — 繁體中文介面', () => {
  it('原生按鈕顯示「分享 / 下載」', async () => {
    m.isNative.mockReturnValue(true);
    useSettingsStore.setState({ language: 'zh-TW' });
    await mount();
    await flush(300);
    expect(btn(translations['zh-TW'].shareModal.shareOrSave)).toBeTruthy();
  });
});
