import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // tsconfig 的 jsx 為 "preserve"（給 Next 用），測試環境需自行轉譯 JSX
  esbuild: { jsx: 'automatic' },
  test: {
    // 預設 node；元件 / hook 測試檔以 `// @vitest-environment jsdom` 切換
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
