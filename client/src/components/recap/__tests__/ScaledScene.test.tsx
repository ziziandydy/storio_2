// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import ScaledScene from '../ScaledScene';

const copy = translations['zh-TW'].recap;
const props = { recap: makeRecap(), copy, locale: 'zh-TW' as const, reflectionIndex: 0 };

type RO = { cb: ResizeObserverCallback; el?: Element };
let observers: RO[] = [];
type IO = { cb: IntersectionObserverCallback; el?: Element };
let intersections: IO[] = [];

describe('ScaledScene（縮圖：前端場景元件縮小顯示，不送去伺服器渲染）', () => {
  beforeEach(() => {
    observers = [];
    intersections = [];
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      rec: RO;
      constructor(cb: ResizeObserverCallback) {
        this.rec = { cb };
        observers.push(this.rec);
      }
      observe(el: Element) {
        this.rec.el = el;
      }
      disconnect() {}
      unobserve() {}
    };
  });
  afterEach(() => {
    cleanup();
    delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  const setWidth = (el: Element, width: number) => {
    Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
    act(() => observers.forEach((o) => o.cb([{ target: el } as ResizeObserverEntry], {} as ResizeObserver)));
  };

  it('渲染真正的場景元件（同一份資料與文案），不是圖片', () => {
    render(<ScaledScene {...props} sceneKey="total" aspectRatio="9:16" />);
    expect(screen.getByTestId('scene-total')).toBeTruthy();
    expect(screen.getByTestId('scene-frame').getAttribute('data-aspect')).toBe('9:16');
  });

  it('依容器寬度等比縮小：scale = 容器寬 / 400', () => {
    render(<ScaledScene {...props} sceneKey="total" aspectRatio="9:16" />);
    const box = screen.getByTestId('scaled-scene');
    setWidth(box, 120);
    const inner = screen.getByTestId('scaled-scene-inner') as HTMLElement;
    expect(inner.style.transform).toBe('scale(0.3)');
    expect(inner.style.width).toBe('400px');
    expect(inner.style.height).toBe('711px');
  });

  it('4:5 的縮圖用 400×500 的場景與 4:5 的框（高度跟著比例，不裁切）', () => {
    render(<ScaledScene {...props} sceneKey="total" aspectRatio="4:5" />);
    const box = screen.getByTestId('scaled-scene') as HTMLElement;
    setWidth(box, 100);
    expect(box.className).toContain('aspect-[4/5]');
    const inner = screen.getByTestId('scaled-scene-inner') as HTMLElement;
    expect(inner.style.height).toBe('500px');
  });

  it('縮圖不攔截點擊（點到縮圖是勾選那個場景，不是操作場景內容），也不被讀屏重複朗讀', () => {
    render(<ScaledScene {...props} sceneKey="total" aspectRatio="9:16" />);
    const box = screen.getByTestId('scaled-scene') as HTMLElement;
    expect(box.style.pointerEvents).toBe('none');
    expect(box.getAttribute('aria-hidden')).toBe('true');
  });

  it('心得場景跟著傳入的心得索引（預覽換句後縮圖同步）', () => {
    const recap = makeRecap();
    const { rerender } = render(<ScaledScene {...props} recap={recap} sceneKey="reflection" aspectRatio="9:16" reflectionIndex={0} />);
    expect(screen.getByTestId('scene-reflection').textContent).toContain('很棒');
    rerender(<ScaledScene {...props} recap={recap} sceneKey="reflection" aspectRatio="9:16" reflectionIndex={1} />);
    expect(screen.getByTestId('scene-reflection').textContent).toContain('還行');
  });

  it('捲到可視範圍才掛載場景（15 個縮圖一次全掛太重），掛過就保留', () => {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      rec: IO;
      constructor(cb: IntersectionObserverCallback) {
        this.rec = { cb };
        intersections.push(this.rec);
      }
      observe(el: Element) {
        this.rec.el = el;
      }
      disconnect() {}
      unobserve() {}
    };
    render(<ScaledScene {...props} sceneKey="total" aspectRatio="9:16" lazy />);
    expect(screen.queryByTestId('scene-total')).toBeNull();
    act(() => intersections.forEach((o) => o.cb([{ isIntersecting: true, target: o.el } as IntersectionObserverEntry], {} as IntersectionObserver)));
    expect(screen.getByTestId('scene-total')).toBeTruthy();
    act(() => intersections.forEach((o) => o.cb([{ isIntersecting: false, target: o.el } as IntersectionObserverEntry], {} as IntersectionObserver)));
    expect(screen.getByTestId('scene-total')).toBeTruthy();
  });

  it('沒有 IntersectionObserver（舊環境、測試）時直接掛載', () => {
    render(<ScaledScene {...props} sceneKey="total" aspectRatio="9:16" lazy />);
    expect(screen.getByTestId('scene-total')).toBeTruthy();
  });
});
