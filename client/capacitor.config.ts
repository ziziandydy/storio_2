import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'fs';
import { join } from 'path';

// 從 .env.local 讀取環境變數
// Dev: 設定 CAPACITOR_DEV_URL 指向本機 dev server
// Release build: 移除此變數，Capacitor 改用 out/ 靜態檔
let devUrl: string | undefined;
let googleWebClientId: string | undefined;
try {
  const envLocal = readFileSync(join(__dirname, '.env.local'), 'utf8');
  const devMatch = envLocal.match(/^CAPACITOR_DEV_URL=(.+)$/m);
  if (devMatch) devUrl = devMatch[1].trim();
  const googleMatch = envLocal.match(/^GOOGLE_WEB_CLIENT_ID=(.+)$/m);
  if (googleMatch) googleWebClientId = googleMatch[1].trim();
} catch {}

// CI/CD（GitHub Actions）透過環境變數提供
if (!googleWebClientId && process.env.GOOGLE_WEB_CLIENT_ID) {
  googleWebClientId = process.env.GOOGLE_WEB_CLIENT_ID;
}

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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: googleWebClientId ?? '',
      forceCodeForRefreshToken: true,
    },
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
