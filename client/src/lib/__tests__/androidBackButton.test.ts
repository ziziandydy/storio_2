import { describe, it, expect, vi } from 'vitest';
import { handleBackButton } from '@/lib/androidBackButton';

describe('handleBackButton', () => {
  it('有瀏覽歷史時呼叫 historyBack，不呼叫 exitApp', () => {
    const historyBack = vi.fn();
    const exitApp = vi.fn();

    handleBackButton(true, historyBack, exitApp);

    expect(historyBack).toHaveBeenCalledOnce();
    expect(exitApp).not.toHaveBeenCalled();
  });

  it('沒有瀏覽歷史時呼叫 exitApp，不呼叫 historyBack', () => {
    const historyBack = vi.fn();
    const exitApp = vi.fn();

    handleBackButton(false, historyBack, exitApp);

    expect(exitApp).toHaveBeenCalledOnce();
    expect(historyBack).not.toHaveBeenCalled();
  });
});
