// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { flush, stubObjectUrls, setWebShare, spyAnchorDownloads } from './shareTestUtils';

const m = vi.hoisted(() => ({
  isNative: vi.fn(() => false),
  health: vi.fn(),
  render: vi.fn(),
  writeFile: vi.fn(),
  nativeShare: vi.fn(),
  base64: vi.fn(),
  token: { current: 'tok' as string | null },
}));

vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, drag, dragConstraints, dragElastic, onDragEnd, ...rest }: Record<string, unknown>) => rest;
  const make = (Tag: string) => ({ children, ...p }: { children?: React.ReactNode } & Record<string, unknown>) => React.createElement(Tag, strip(p), children);
  return { motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }), AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
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
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: m.token.current }) }));
vi.mock('@/lib/api', () => ({ getApiUrl: (p: string) => `http://api.test${p}` }));
vi.mock('@/components/share/MonthlyRecapTemplate', () => ({
  default: (p: { monthName: string; selectedTemplate: string }) => <div data-testid="preview-recap" data-template={p.selectedTemplate}>{p.monthName}</div>,
}));

import MonthlyRecapModal from '@/components/MonthlyRecapModal';
import { invalidateCache } from '@/hooks/useProgressiveRenderQueue';
import { useSettingsStore } from '@/store/settingsStore';
import { translations } from '@/i18n/locales';

const T = translations['en-US'];
const STATS = {
  summary: { movie: 2, book: 1, tv: 1 },
  items: [{ id: 1, title: 'Dune' }, { id: 2, title: 'Walden' }],
};
const baseProps = { isOpen: true, onClose: vi.fn(), monthValue: '2026-02', monthName: 'FEB 2026' };
const ui = (over: Partial<React.ComponentProps<typeof MonthlyRecapModal>> = {}) => <MonthlyRecapModal {...baseProps} {...over} />;
const mount = async (over: Partial<React.ComponentProps<typeof MonthlyRecapModal>> = {}) => {
  const r = render(ui(over));
  await flush(50);
  return r;
};
const btn = (name: RegExp | string) => screen.getByRole('button', { name });
const queryBtn = (name: RegExp | string) => screen.queryByRole('button', { name });
const renderedTemplates = () => m.render.mock.calls.map((c) => c[0].settings.selectedTemplate);
const okJson = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) });

let fetchMock: ReturnType<typeof vi.fn>;
let revoked: string[];

beforeEach(() => {
  vi.useFakeTimers();
  revoked = stubObjectUrls();
  m.isNative.mockReturnValue(false);
  m.token.current = 'tok';
  m.health.mockReset().mockResolvedValue(true);
  m.render.mockReset().mockImplementation(async (p: { settings: { selectedTemplate: string } }) => Object.assign(new Blob([p.settings.selectedTemplate]), { tag: p.settings.selectedTemplate }));
  m.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/recap.png' });
  m.nativeShare.mockReset().mockResolvedValue(undefined);
  m.base64.mockReset().mockResolvedValue('BASE64DATA');
  fetchMock = vi.fn().mockResolvedValue(okJson(STATS));
  vi.stubGlobal('fetch', fetchMock);
  baseProps.onClose = vi.fn();
  useSettingsStore.setState({ language: 'en-US' });
  setWebShare({});
  invalidateCache();
  revoked.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('MonthlyRecapModal — 資料載入', () => {
  it('用 Bearer token 取得該月統計', async () => {
    await mount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/collection/stats/monthly?month=2026-02');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('沒有 token 時不請求、也不渲染', async () => {
    m.token.current = null;
    await mount();
    await flush(300);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.render).not.toHaveBeenCalled();
  });

  it('isOpen=false 不請求資料、不檢查服務', async () => {
    await mount({ isOpen: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.health).not.toHaveBeenCalled();
  });

  it('統計 API 失敗（非 2xx）時不會送出渲染請求', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    await mount();
    await flush(300);
    expect(m.render).not.toHaveBeenCalled();
    expect(screen.queryByTestId('preview-recap')).toBeNull();
  });

  it('統計 API 網路錯誤時不當機、不渲染', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await mount();
    await flush(300);
    expect(m.render).not.toHaveBeenCalled();
  });

  it('關閉再開啟會重新取得資料', async () => {
    const { rerender } = await mount();
    rerender(ui({ isOpen: false }));
    await flush(50);
    rerender(ui({ isOpen: true }));
    await flush(50);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('切換月份會以新月份重新取得', async () => {
    const { rerender } = await mount();
    rerender(ui({ monthValue: '2026-03', monthName: 'MAR 2026' }));
    await flush(50);
    expect(fetchMock.mock.calls.at(-1)![0]).toMatch(/month=2026-03$/);
  });
});

describe('MonthlyRecapModal — 即時渲染', () => {
  it('資料載入前顯示骨架，載入且服務就緒後才渲染', async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    await mount();
    await flush(300);
    expect(m.render).not.toHaveBeenCalled();           // 服務就緒但資料還沒到

    await act(async () => { resolve(okJson(STATS)); });
    await flush(100);
    expect(m.render).toHaveBeenCalled();
  });

  it('回歸：服務比資料先就緒時不會拿空資料渲染並快取，資料到達後渲染的是真實統計', async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    await mount();
    await flush(300);
    expect(m.render).not.toHaveBeenCalled();
    await act(async () => { resolve(okJson(STATS)); });
    await flush(300);
    expect(m.render.mock.calls.length).toBeGreaterThan(0);
    for (const [payload] of m.render.mock.calls) expect(payload.item.statsData.items).toEqual(STATS.items);
    expect(renderedTemplates()[0]).toBe('calendar');
  });

  it('payload 帶入月份與統計資料，預設模板為 calendar', async () => {
    await mount();
    await flush(200);
    expect(m.render.mock.calls[0][0]).toEqual({
      template: 'monthly-recap',
      item: { monthName: 'FEB 2026', monthValue: '2026-02', statsData: { summary: STATS.summary, items: STATS.items } },
      settings: { aspectRatio: '9:16', selectedTemplate: 'calendar' },
    });
  });

  it('依序渲染 calendar（優先）→ collage → waterfall → shelf', async () => {
    await mount();
    await flush(300);
    expect(renderedTemplates()).toEqual(['calendar', 'collage', 'waterfall', 'shelf']);
  });

  it('提供四種月回顧模板按鈕', async () => {
    await mount();
    await flush(200);
    for (const label of [T.shareModal.templates.monthlyCalendar, T.shareModal.templates.monthlyCollage, T.shareModal.templates.monthlyWaterfall, T.shareModal.templates.shelf]) {
      expect(btn(new RegExp(label))).toBeTruthy();
    }
  });

  it('渲染完成前顯示 React 預覽，完成後換成 PNG', async () => {
    let release!: (b: Blob) => void;
    m.render.mockImplementationOnce(() => new Promise<Blob>((r) => { release = r; }));
    await mount();
    await flush(50);
    expect(screen.getByTestId('preview-recap').getAttribute('data-template')).toBe('calendar');
    await act(async () => { release(new Blob(['png'])); });
    await flush(50);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toMatch(/^blob:mock-/);
    expect(img.alt).toBe('FEB 2026');
  });

  it('切換到尚未渲染的模板會優先渲染它', async () => {
    let release!: (b: Blob) => void;
    m.render.mockImplementationOnce(() => new Promise<Blob>((r) => { release = r; }));
    await mount();
    await flush(50);
    fireEvent.click(btn(new RegExp(T.shareModal.templates.monthlyWaterfall)));
    await act(async () => { release(new Blob(['x'])); });
    await flush(300);
    expect(renderedTemplates()[1]).toBe('waterfall');
    expect(renderedTemplates().sort()).toEqual(['calendar', 'collage', 'shelf', 'waterfall']);
  });

  it('本月沒有典藏時顯示空狀態，分享鈕為 disabled', async () => {
    m.isNative.mockReturnValue(true);
    fetchMock.mockResolvedValue(okJson({ summary: { movie: 0, book: 0, tv: 0 }, items: [] }));
    await mount();
    await flush(300);
    expect(screen.getByText('本月尚無典藏記憶可分享。')).toBeTruthy();
    const share = screen.getByText(/請稍候|Share/).closest('button') as HTMLButtonElement;
    fireEvent.click(share);
    expect(m.writeFile).not.toHaveBeenCalled();
  });

  it('回歸：開啟後不會 1.5s 後把已渲染的圖作廢再重跑', async () => {
    await mount();
    await flush(300);
    const first = m.render.mock.calls.length;
    revoked.length = 0;
    await flush(5000);
    expect(m.render.mock.calls.length).toBe(first);
    expect(revoked).toEqual([]);
  });

  it('服務冷啟動期間顯示等待畫面；逾時顯示無法使用，重試可恢復', async () => {
    m.health.mockResolvedValue(false);
    await mount();
    expect(screen.getByText('圖片服務準備中...')).toBeTruthy();
    await flush(61000);
    expect(screen.getByText('服務暫時無法使用')).toBeTruthy();
    expect(m.render).not.toHaveBeenCalled();
    m.health.mockResolvedValue(true);
    fireEvent.click(btn(/稍後再試/));
    await flush(200);
    expect(m.render).toHaveBeenCalled();
  });

  it('關閉會清空快取並 revoke objectUrl', async () => {
    const { rerender } = await mount();
    await flush(300);
    revoked.length = 0;
    rerender(ui({ isOpen: false }));
    await flush(50);
    expect(revoked.length).toBeGreaterThan(0);
  });
});

describe('MonthlyRecapModal — 原生 App 分享 / 儲存', () => {
  beforeEach(() => m.isNative.mockReturnValue(true));

  it('只有「Share / Download」一顆按鈕，沒有 Download / Saved', async () => {
    await mount();
    await flush(300);
    expect(btn(T.shareModal.shareOrSave)).toBeTruthy();
    expect(queryBtn(new RegExp(`^${T.shareModal.download}$`))).toBeNull();
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
  });

  it('寫入 Cache 後以檔案 URI 開啟系統分享面板（檔名含月份）', async () => {
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    const w = m.writeFile.mock.calls[0][0];
    expect(w.path).toMatch(/^storio-monthly-2026-02_\d+\.png$/);
    expect(w.data).toBe('BASE64DATA');
    expect(w.directory).toBe('CACHE');
    expect(m.nativeShare.mock.calls[0][0]).toEqual({
      title: 'FEB 2026',
      text: `${T.details.shareMessage} ${window.location.origin}`,
      url: 'file:///cache/recap.png',
    });
  });

  it('分享的是目前選取模板的圖', async () => {
    await mount();
    await flush(300);
    fireEvent.click(btn(new RegExp(T.shareModal.templates.monthlyCollage)));
    await flush(50);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect((m.base64.mock.calls[0][0] as Blob & { tag: string }).tag).toBe('collage');
  });

  it('回歸：不使用 <a download>、失敗時不顯示 Saved', async () => {
    m.nativeShare.mockRejectedValueOnce(new Error('canceled'));
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(downloads).toEqual([]);
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
    expect((btn(T.shareModal.shareOrSave) as HTMLButtonElement).disabled).toBe(false);
  });

  it('回歸：快取過期後按分享會重新渲染而不是毫無反應', async () => {
    await mount();
    await flush(300);
    await flush(5 * 60 * 1000 + 2000);
    m.render.mockClear();
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(300);
    expect(m.render).toHaveBeenCalled();
    expect(m.nativeShare).not.toHaveBeenCalled();
  });
});

describe('MonthlyRecapModal — 網頁版', () => {
  it('支援 Web Share 時以 File 分享', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setWebShare({ share, canShare: () => true });
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(share.mock.calls[0][0].files[0].name).toBe('storio-monthly-2026-02.png');
  });

  it('Web Share 失敗時退回下載', async () => {
    setWebShare({ share: vi.fn().mockRejectedValue(new Error('x')), canShare: () => true });
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(T.shareModal.shareOrSave)); });
    await flush(50);
    expect(downloads.map((d) => d.download)).toEqual(['storio-monthly-2026-02.png']);
  });

  it('桌面瀏覽器：Download 下載 PNG 並短暫顯示 Saved', async () => {
    const { downloads } = spyAnchorDownloads();
    await mount();
    await flush(300);
    await act(async () => { fireEvent.click(btn(new RegExp(T.shareModal.download))); });
    expect(downloads.map((d) => d.download)).toEqual(['storio-monthly-2026-02.png']);
    expect(screen.getByText(T.shareModal.saved)).toBeTruthy();
    await flush(2100);
    expect(screen.queryByText(T.shareModal.saved)).toBeNull();
  });
});
