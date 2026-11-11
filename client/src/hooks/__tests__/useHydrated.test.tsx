// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useHydrated } from '../useHydrated';

function Probe() {
  const hydrated = useHydrated();
  return <span data-testid="probe">{hydrated ? 'client' : 'server'}</span>;
}

describe('useHydrated', () => {
  afterEach(cleanup);

  it('伺服器端與第一次 client render 都是 false（與預先產生的 HTML 一致，避免 hydration 不一致）', () => {
    expect(renderToString(<Probe />)).toContain('server');
  });

  it('掛載後變成 true', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe').textContent).toBe('client');
  });
});
