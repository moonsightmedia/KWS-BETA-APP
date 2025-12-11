import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { removeCrossorigin } from "./vite-plugin-remove-crossorigin";
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Custom plugin to inject version info
const versionPlugin = () => {
  const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
  const appVersion = packageJson.version || '0.0.0';
  const buildTimestamp = new Date().toISOString();
  
  return {
    name: 'version-plugin',
    config(config, { mode }) {
      // Always read fresh version from package.json (important for dev mode and Android Studio)
      const currentPackageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
      const currentVersion = currentPackageJson.version || '0.0.0';
      const currentTimestamp = new Date().toISOString();
      
      console.log(`[version-plugin] Using version: ${currentVersion} (mode: ${mode})`);
      
      return {
        define: {
          'import.meta.env.VITE_APP_VERSION': JSON.stringify(currentVersion),
          'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(currentTimestamp),
        },
      };
    },
    // Generate version.json file for update checking
    closeBundle() {
      // Read fresh version from package.json
      const currentPackageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
      const currentVersion = currentPackageJson.version || '0.0.0';
      const currentTimestamp = new Date().toISOString();
      
      const versionInfo = {
        version: currentVersion,
        buildTimestamp: currentTimestamp,
        buildDate: new Date(currentTimestamp).toLocaleDateString('de-DE'),
      };
      
      // Write to dist folder
      const distPath = path.resolve(__dirname, 'dist');
      if (existsSync(distPath)) {
        writeFileSync(
          path.join(distPath, 'version.json'),
          JSON.stringify(versionInfo, null, 2)
        );
        console.log('[version-plugin] Generated version.json:', versionInfo);
      }

      // Also write to android assets for Capacitor
      const androidAssetsPath = path.resolve(__dirname, 'android/app/src/main/assets/public');
      if (existsSync(androidAssetsPath)) {
        writeFileSync(
          path.join(androidAssetsPath, 'version.json'),
          JSON.stringify(versionInfo, null, 2)
        );
        console.log('[version-plugin] Generated version.json for Android:', versionInfo);
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative base path for better compatibility
  base: './',
  server: {
    host: "::",
    port: 8080,
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
    // Exclude FFmpeg from pre-bundling as it uses WebAssembly
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
}));
