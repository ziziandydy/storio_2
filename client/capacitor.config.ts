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
      // ⚠️ 這裡要放 Web Client ID，不是 Android OAuth Client ID！
      // @codetrix-studio/capacitor-google-auth 的 Android 原生實作
      // （GoogleAuth.java）直接把這個值傳給
      // GoogleSignInOptions.Builder.requestIdToken()，而 requestIdToken()
      // 依 Google 規範只接受 Web 類型的 Client ID（idToken 的 audience）。
      // 新建的 Android OAuth Client（package name + SHA-1）本身仍需要存在於
      // Google Cloud Console，但它是給 Google Play Services SDK 背景比對
      // 簽署用的，不該被塞進這個欄位——塞錯會導致 DEVELOPER_ERROR (code 10)。
      androidClientId: googleWebClientId ?? '',
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
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#c5a059',
    },
  },
};

export default config;
