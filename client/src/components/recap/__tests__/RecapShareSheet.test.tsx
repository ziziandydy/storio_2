// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import { buildScenes } from '@/lib/recap/scenes';

const m = vi.hoisted(() => ({
  isNative: vi.fn(),
  health: vi.fn(),
  saveAll: vi.fn(),
  shareOne: vi.fn(),
  track: vi.fn(),
  renderOne: vi.fn(),
  renderMany: vi.fn(),
  clearCache: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: m.isNative } }));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'], locale: 'zh-TW' }) };
});
vi.mock('@/lib/share-api', () => ({ getRenderServiceHealth: m.health }));
vi.mock('@/lib/analytics', () => ({ track: m.track }));
vi.mock('@/lib/recap/shareImages', () => ({ saveAllImages: m.saveAll, shareOneImage: m.shareOne }));
vi.mock('@/lib/recap/renderCache', () => ({
  renderRecapScene: m.renderOne,
  renderRecapScenes: m.renderMany,
  clearRenderCache: m.clearCache,
}));
// 縮圖是前端場景元件：這裡換成簡版，記錄它收到的比例與心得索引
vi.mock('../ScaledScene', () => ({
  default: ({ sceneKey, aspectRatio, reflectionIndex }: { sceneKey: string; aspectRatio: string; reflectionIndex: number }) => (
    <div data-testid={`thumb-${sceneKey}`} data-aspect={aspectRatio} data-reflection={reflectionIndex} />
  ),
}));

import RecapShareSheet from '../RecapShareSheet';

const recap = makeRecap();
const allKeys = buildScenes(recap, { forShare: true });
const blobFor = (key: string) => new Blob([key]);
const open = (props: Partial<React.ComponentProps<typeof RecapShareSheet>> = {}) =>
  render(<RecapShareSheet isOpen onClose={() => {}} recap={recap} reflectionIndex={0} locale="zh-TW" {...props} />);
const manyResult = (keys: string[]) => keys.map((sceneKey) => ({ sceneKey, blob: blobFor(sceneKey) }));
const clickMain = () => act(async () => { fireEvent.click(screen.getByTestId('share-main')); });
const renderedKeys = () => (m.renderMany.mock.calls[0][0].sceneKeys as string[]);

describe('RecapShareSheet（縮圖用前端場景元件；只有儲存／分享時才渲染被勾選的）', () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.isNative.mockReturnValue(true);
    m.health.mockResolvedValue(true);
    m.renderMany.mockImplementation(async ({ sceneKeys }: { sceneKeys: string[] }) => manyResult(sceneKeys));
    m.renderOne.mockImplementation(async ({ sceneKey }: { sceneKey: string }) => blobFor(sceneKey));
    m.saveAll.mockResolvedValue({ status: 'saved' });
    m.shareOne.mockResolvedValue({ status: 'shared' });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('一打開就有全部縮圖與可按的按鈕：不用等圖片服務，開啟當下完全不渲染', () => {
    open();
    expect(screen.getAllByRole('checkbox')).toHaveLength(allKeys.length);
    for (const key of allKeys) expect(screen.getByTestId(`thumb-${key}`)).toBeTruthy();
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false);
    expect(m.renderMany).not.toHaveBeenCalled();
    expect(m.renderOne).not.toHaveBeenCalled();
  });

  it('預設全選，場景清單含結尾場景、不含「繼續收藏」與影片選項', () => {
    const { container } = open();
    expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).every((c) => c.checked)).toBe(true);
    expect(screen.queryByTestId('thumb-closing')).toBeTruthy();
    expect(container.textContent).not.toContain('繼續收藏');
    expect(container.textContent).not.toMatch(/影片|video/i);
  });

  it('開啟時在背景叫醒圖片服務（Railway 冷啟動），但不擋畫面', async () => {
    open();
    await waitFor(() => expect(m.health).toHaveBeenCalled());
    expect(screen.getByTestId('share-main')).toBeTruthy();
  });

  it('比例切換：縮圖框跟著 9:16／4:5', () => {
    open();
    expect(screen.getByTestId('thumb-total').getAttribute('data-aspect')).toBe('9:16');
    fireEvent.click(screen.getByTestId('ratio-4:5'));
    expect(screen.getByTestId('thumb-total').getAttribute('data-aspect')).toBe('4:5');
  });

  it('心得換句：縮圖拿到更新後的心得索引（預覽＝縮圖＝輸出）', () => {
    open({ reflectionIndex: 1 });
    expect(screen.getByTestId('thumb-reflection').getAttribute('data-reflection')).toBe('1');
  });

  it('儲存全部：只渲染被勾選的場景（依場景順序），不含取消勾選的', async () => {
    open();
    fireEvent.click(screen.getByTestId('scene-check-reflection'));
    fireEvent.click(screen.getByTestId('scene-check-books'));
    await clickMain();
    const keys = renderedKeys();
    expect(keys).not.toContain('reflection');
    expect(keys).not.toContain('books');
    expect(keys).toEqual(allKeys.filter((k) => k !== 'reflection' && k !== 'books'));
    expect(m.renderMany.mock.calls[0][0].settings).toEqual({ aspectRatio: '9:16', locale: 'zh-TW', reflectionIndex: 0 });
    expect(m.saveAll.mock.calls[0][0].map((i: { name: string }) => i.name)).toEqual(keys);
  });

  it('切到 4:5、心得索引改變：渲染設定跟著變', async () => {
    open({ reflectionIndex: 1 });
    fireEvent.click(screen.getByTestId('ratio-4:5'));
    await clickMain();
    expect(m.renderMany.mock.calls[0][0].settings).toEqual({ aspectRatio: '4:5', locale: 'zh-TW', reflectionIndex: 1 });
  });

  it('全部取消勾選：主按鈕停用並提示至少選一張', () => {
    const { container } = open();
    for (const key of allKeys) fireEvent.click(screen.getByTestId(`scene-check-${key}`));
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain('請至少選一張');
  });

  it('渲染中顯示進度（已產生 n/m）並停用按鈕，完成後恢復', async () => {
    let finish!: () => void;
    m.renderMany.mockImplementation(({ sceneKeys, onProgress }: { sceneKeys: string[]; onProgress: (d: number, t: number) => void }) =>
      new Promise((resolve) => {
        onProgress(3, sceneKeys.length);
        finish = () => resolve(manyResult(sceneKeys));
      }),
    );
    open();
    await clickMain();
    expect(screen.getByTestId('share-progress').textContent).toContain(`已產生 3/${allKeys.length}`);
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish());
    await waitFor(() => expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false));
  });

  it('關閉面板不清空渲染快取（下次再開、切回同一比例直接用）', () => {
    const { rerender } = open();
    rerender(<RecapShareSheet isOpen={false} onClose={() => {}} recap={recap} reflectionIndex={0} locale="zh-TW" />);
    expect(m.clearCache).not.toHaveBeenCalled();
  });

  it('網頁下載：downloaded 顯示中性文案（不說「相簿」），仍記錄事件', async () => {
    m.isNative.mockReturnValue(false);
    m.saveAll.mockResolvedValue({ status: 'downloaded' });
    open();
    await clickMain();
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('已開始下載'));
    expect(screen.getByTestId('share-result').textContent).not.toContain('相簿');
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it('cancelled：不顯示「已儲存」，也不記錄 recap_shared', async () => {
    m.saveAll.mockResolvedValue({ status: 'cancelled' });
    const { container } = open();
    await clickMain();
    await waitFor(() => expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false));
    expect(container.textContent).not.toContain('已儲存');
    expect(m.track).not.toHaveBeenCalled();
  });

  it('saved：顯示「已儲存到相簿」並記錄 recap_shared（年份與張數）', async () => {
    open();
    await clickMain();
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('已儲存到相簿'));
    expect(m.track).toHaveBeenCalledWith('recap_shared', { year: 2026, sceneCount: allKeys.length });
  });

  it('shared：中性文案「已完成」，仍記錄事件', async () => {
    m.saveAll.mockResolvedValue({ status: 'shared' });
    open();
    await clickMain();
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('已完成'));
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it('儲存／分享出錯：顯示錯誤、不記錄事件，主按鈕仍可再按（重試）', async () => {
    m.saveAll.mockResolvedValue({ status: 'error', message: 'x' });
    open();
    await clickMain();
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('沒有成功'));
    expect(m.track).not.toHaveBeenCalled();
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false);
  });

  it('任何一張渲染失敗：整批不送出（不可少張還顯示成功）、顯示錯誤、不記錄事件', async () => {
    m.renderMany.mockRejectedValue(new Error('render failed'));
    open();
    await clickMain();
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('沒有成功'));
    expect(m.saveAll).not.toHaveBeenCalled();
    expect(m.track).not.toHaveBeenCalled();
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false);
  });

  it('「分享這一張」只渲染該場景並只傳該場景，recap_shared 場景數為 1', async () => {
    open();
    await act(async () => { fireEvent.click(screen.getByTestId('share-one-movies')); });
    expect(m.renderOne).toHaveBeenCalledTimes(1);
    expect(m.renderOne.mock.calls[0][0].sceneKey).toBe('movies');
    expect(m.renderMany).not.toHaveBeenCalled();
    expect(m.shareOne.mock.calls[0][0].name).toBe('movies');
    expect(m.track).toHaveBeenCalledWith('recap_shared', { year: 2026, sceneCount: 1 });
  });

  it('單張渲染失敗：顯示錯誤，不呼叫分享', async () => {
    m.renderOne.mockRejectedValue(new Error('boom'));
    open();
    await act(async () => { fireEvent.click(screen.getByTestId('share-one-total')); });
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('沒有成功'));
    expect(m.shareOne).not.toHaveBeenCalled();
  });

  it('網頁版主按鈕文案為「下載全部」；原生為「儲存全部到相簿」', () => {
    m.isNative.mockReturnValue(false);
    const web = open();
    expect(web.getByTestId('share-main').textContent).toContain('下載全部');
    web.unmount();
    m.isNative.mockReturnValue(true);
    open();
    expect(screen.getByTestId('share-main').textContent).toContain('儲存全部到相簿');
  });

  describe('圖片服務還沒醒（冷啟動）', () => {
    it('按儲存時先等服務就緒（顯示準備中），就緒後才渲染', async () => {
      vi.useFakeTimers();
      m.health.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValue(true);
      open();
      await act(async () => { await Promise.resolve(); });
      await act(async () => { fireEvent.click(screen.getByTestId('share-main')); });
      expect(screen.getByTestId('share-main').textContent).toContain('圖片服務準備中');
      expect(m.renderMany).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(7000); });
      expect(m.renderMany).toHaveBeenCalledTimes(1);
    });

    it('一直沒醒：60 秒後顯示不可用與重試，不無限轉圈、不渲染', async () => {
      vi.useFakeTimers();
      m.health.mockResolvedValue(false);
      open();
      await act(async () => { await Promise.resolve(); });
      await act(async () => { fireEvent.click(screen.getByTestId('share-main')); });
      await act(async () => { await vi.advanceTimersByTimeAsync(61000); });
      expect(screen.getByText('圖片服務暫時無法使用')).toBeTruthy();
      expect(screen.getByTestId('share-retry')).toBeTruthy();
      expect(m.renderMany).not.toHaveBeenCalled();
      expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
