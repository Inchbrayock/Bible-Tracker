/// <reference types="@capacitor-firebase/authentication" />
/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/status-bar" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.selah.bible',
  appName: 'Selah',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#F7F7F4',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
    },
  },
};

export default config;
