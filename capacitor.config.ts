import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kletterwelt.beta',
  appName: 'KWS Beta App',
  webDir: 'dist',
  server: {
    // For development, you can uncomment this to use a local server:
    // url: 'http://192.168.2.80:8080',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;

