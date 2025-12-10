import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative base path for better compatibility
  base: './',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
  },
  publicDir: 'public',
  optimizeDeps: {
    // Exclude FFmpeg from pre-bundling as it uses WebAssembly
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
}));
