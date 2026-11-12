// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import PosterImage, { PosterLoadGate } from '../PosterImage';
import { DEFAULT_POSTER } from '../posterSrc';
import { __resetPosterLoader } from '../posterLoader';
import { FakeImage, flush } from './fakeImage';

const TMDB = 'https://image.tmdb.org/t/p/w500/a.jpg';

describe('PosterImage', () => {
  beforeEach(() => {
    FakeImage.install();
    __resetPosterLoader();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('本機海報立刻設定 src', () => {
    render(<PosterImage path="/image/p.png" testId="poster" />);
    const img = screen.getByTestId('poster') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/image/p.png');
    expect(img.getAttribute('crossorigin')).toBeNull();
  });

  it('空值用預設海報', () => {
    render(<PosterImage path={null} testId="poster" />);
    expect(screen.getByTestId('poster').getAttribute('src')).toBe(DEFAULT_POSTER);
  });

  it('遠端海報：載入成功前 <img> 沒有 src（不會出現破圖），成功後才交給 <img>，且不帶 crossOrigin', async () => {
    render(<PosterImage path={TMDB} testId="poster" />);
    const img = screen.getByTestId('poster') as HTMLImageElement;
    expect(img.hasAttribute('src')).toBe(false);
    expect(img.getAttribute('data-poster')).toBe(TMDB);
    await waitFor(() => expect(img.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w342/a.jpg'));
    expect(img.getAttribute('crossorigin')).toBeNull();
  });

  it('所有來源都失敗時顯示預設海報', async () => {
    FakeImage.behavior = () => 'fail';
    render(<PosterImage path={TMDB} testId="poster" />);
    await waitFor(() => expect(screen.getByTestId('poster').getAttribute('src')).toBe(DEFAULT_POSTER));
  });

  it('交給 <img> 之後仍然出錯（極少數）就換成預設海報，不留破圖', async () => {
    render(<PosterImage path={TMDB} testId="poster" />);
    const img = screen.getByTestId('poster') as HTMLImageElement;
    await waitFor(() => expect(img.hasAttribute('src')).toBe(true));
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe(DEFAULT_POSTER);
  });

  it('PosterLoadGate 關著（離目前頁太遠）時不開始載入；打開後才載入，之後關回去也保留', async () => {
    const { rerender } = render(
      <PosterLoadGate near={false} active={false}>
        <PosterImage path={TMDB} testId="poster" />
      </PosterLoadGate>,
    );
    await flush();
    expect(FakeImage.created).toHaveLength(0);

    rerender(
      <PosterLoadGate near active={false}>
        <PosterImage path={TMDB} testId="poster" />
      </PosterLoadGate>,
    );
    await waitFor(() => expect(screen.getByTestId('poster').hasAttribute('src')).toBe(true));

    await act(async () => {
      rerender(
        <PosterLoadGate near={false} active={false}>
          <PosterImage path={TMDB} testId="poster" />
        </PosterLoadGate>,
      );
    });
    expect(screen.getByTestId('poster').getAttribute('src')).toBe('https://image.tmdb.org/t/p/w342/a.jpg');
  });
});
