import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kletterwelt.beta',
  appName: 'KWS Beta App',
  webDir: 'dist',
  // server: {
  //   url: 'http://192.168.2.80:8080', // Dev Server Port - nur für Development aktivieren!
  //   cleartext: true,
  // },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
