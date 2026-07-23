/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_ORG_URL?: string;
  readonly VITE_TELEMETRY_ENABLED?: string;
  readonly VITE_NATIVE_BACKGROUND_UPLOAD?: string;
  readonly VITE_ALLINKL_API_URL?: string;
  readonly VITE_NATIVE_VIDEO_API_URL?: string;
  readonly VITE_USE_ALLINKL_STORAGE?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
