import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kletterwelt.beta',
  appName: 'KWS Beta App',
  webDir: 'dist',
  server: {
    // Für Development: lokale URL
    // url: 'http://localhost:8080',
    // cleartext: true,
    
    // Für Production: Live-URL (optional - kann auch lokal gebaut werden)
    // url: 'https://beta.kletterwelt-sauerland.de',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
