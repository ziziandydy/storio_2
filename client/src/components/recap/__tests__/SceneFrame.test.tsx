// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SceneFrame from '../SceneFrame';

describe('SceneFrame', () => {
  afterEach(cleanup);

  it('9:16 固定 400×711、4:5 固定 400×500', () => {
    const { rerender } = render(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    let style = (screen.getByTestId('scene-frame') as HTMLElement).style;
    expect([style.width, style.height]).toEqual(['400px', '711px']);

    rerender(<SceneFrame aspectRatio="4:5">x</SceneFrame>);
    style = (screen.getByTestId('scene-frame') as HTMLElement).style;
    expect([style.width, style.height]).toEqual(['400px', '500px']);
  });

  it('角落有 Storio 標誌', () => {
    render(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    const logo = screen.getByTestId('scene-logo') as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('/image/logo/logo.png');
    expect(logo.alt).toBe('Storio');
  });

  it('渲染 children', () => {
    render(<SceneFrame aspectRatio="9:16"><span>內容</span></SceneFrame>);
    expect(screen.getByText('內容')).toBeTruthy();
  });

  it('背景海報最多 6 張，沒有海報時不渲染海報', () => {
    const many = Array.from({ length: 9 }, (_, i) => `/image/p${i}.png`);
    const { rerender } = render(<SceneFrame aspectRatio="9:16" posters={many}>x</SceneFrame>);
    expect(screen.getAllByTestId('scene-poster')).toHaveLength(6);

    rerender(<SceneFrame aspectRatio="9:16" posters={[]}>x</SceneFrame>);
    expect(screen.queryAllByTestId('scene-poster')).toHaveLength(0);

    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(screen.queryAllByTestId('scene-poster')).toHaveLength(0);
  });

  it('filmEdge 才有底片邊標記', () => {
    const { container, rerender } = render(<SceneFrame aspectRatio="9:16" filmEdge>x</SceneFrame>);
    expect(container.querySelector('[data-film-edge]')).not.toBeNull();
    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(container.querySelector('[data-film-edge]')).toBeNull();
  });
});
