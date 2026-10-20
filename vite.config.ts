import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { removeCrossorigin } from "./vite-plugin-remove-crossorigin";
import { readFileSync } from 'fs';

// Custom plugin to inject version info
const versionPlugin = () => {
  let appVersion = '0.0.0';
  const buildTimestamp = new Date().toISOString();
  let releaseRevision = '';
  
  return {
    name: 'version-plugin',
    config(config, { mode }) {
      // Always read fresh version from package.json (important for dev mode and Android Studio)
      const currentPackageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
      appVersion = currentPackageJson.version || '0.0.0';
      releaseRevision = process.env.VITE_RELEASE_REVISION || '';
      
      console.log(`[version-plugin] Using version: ${appVersion} (mode: ${mode})`);
      
      return {
        define: {
          'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
          'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
        },
      };
    },
    // Generate version.json file for update checking
    generateBundle() {
      // The manifest and compiled app must describe the very same build. A new
      // timestamp here makes an unchanged app report an update forever.
      const versionInfo = {
        version: appVersion,
        buildTimestamp,
        buildDate: new Date(buildTimestamp).toLocaleDateString('de-DE'),
        revision: releaseRevision,
      };
      
      // Emit into the selected output directory. Capacitor copies this same
      // manifest during sync; a web/QA build must not modify native assets.
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(versionInfo, null, 2) });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Web and Capacitor both serve assets from their origin root. A relative base
  // breaks full reloads on nested routes, including the demo login switch.
  base: '/',
  server: {
    host: "::",
    port: 8080,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    versionPlugin(), // Add version plugin
    removeCrossorigin(), // Remove crossorigin for Capacitor compatibility
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        // Ensure FFmpeg.wasm files are handled correctly
        manualChunks: undefined,
      },
    },
    // Exclude service worker from build - it's disabled
    copyPublicDir: true,
    // Disable crossorigin attribute for Capacitor compatibility
    assetsInlineLimit: 0,
  },
  publicDir: 'public',
  optimizeDeps: {
    include: ['react', 'react-dom'],
    // Exclude FFmpeg from pre-bundling as it uses WebAssembly
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
}));
