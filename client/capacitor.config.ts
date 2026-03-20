import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.storio.app',
  appName: 'storio',
  webDir: 'out',
  server: {
    cleartext: true,
    androidScheme: 'https',
    url: 'http://192.168.50.137:3010',
  },
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
