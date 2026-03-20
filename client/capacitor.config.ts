import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'fs';
import { join } from 'path';

// 從 .env.local 讀取 CAPACITOR_DEV_URL
// Dev: 設定此變數指向本機 dev server
// Release build: 移除此變數，Capacitor 改用 out/ 靜態檔
let devUrl: string | undefined;
try {
  const envLocal = readFileSync(join(__dirname, '.env.local'), 'utf8');
  const match = envLocal.match(/^CAPACITOR_DEV_URL=(.+)$/m);
  if (match) devUrl = match[1].trim();
} catch {}

const config: CapacitorConfig = {
  appId: 'com.storio.app',
  appName: 'storio',
  webDir: 'out',
  ...(devUrl ? {
    server: {
      cleartext: true,
      androidScheme: 'https',
      url: devUrl,
    },
  } : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#0d0d0d",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
