import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'fs';
import { join } from 'path';

// 讀取指定 env 檔案中的某個 key
function readEnvValue(filePath: string, key: string): string | undefined {
  try {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

const envLocal = join(__dirname, '.env.local');
const envProduction = join(__dirname, '.env.production');

// 優先順序：.env.local → .env.production → process.env（CI/CD）
const devUrl =
  readEnvValue(envLocal, 'CAPACITOR_DEV_URL');

const googleIosClientId =
  readEnvValue(envLocal, 'GOOGLE_IOS_CLIENT_ID') ??
  readEnvValue(envProduction, 'GOOGLE_IOS_CLIENT_ID') ??
  process.env.GOOGLE_IOS_CLIENT_ID;

const googleWebClientId =
  readEnvValue(envLocal, 'GOOGLE_WEB_CLIENT_ID') ??
  readEnvValue(envProduction, 'GOOGLE_WEB_CLIENT_ID') ??
  process.env.GOOGLE_WEB_CLIENT_ID;

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
      clientId: googleIosClientId ?? '',
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
