/**
 * Version utilities for the app
 * Provides version information and update checking
 */

// Version from package.json (injected by Vite plugin)
// The Vite plugin reads package.json and injects it as VITE_APP_VERSION
// This works in both dev and production mode, including Android Studio
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';

// Build timestamp (will be replaced during build)
// In development, use current time
export const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString();
export const RELEASE_REVISION = import.meta.env.VITE_RELEASE_REVISION || '';

// Build date (formatted)
export const BUILD_DATE = new Date(BUILD_TIMESTAMP).toLocaleDateString('de-DE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

// Build time (formatted)
export const BUILD_TIME = new Date(BUILD_TIMESTAMP).toLocaleTimeString('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Get full version info
 */
export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    revision: RELEASE_REVISION,
    buildTimestamp: BUILD_TIMESTAMP,
    buildDate: BUILD_DATE,
    buildTime: BUILD_TIME,
    isDevelopment: import.meta.env.DEV,
    mode: import.meta.env.MODE,
  };
};

/**
 * Check if a new version is available
 * This compares the current build timestamp with a remote version file
 */
export type WebUpdateInfo = { hasUpdate: boolean; latestVersion: string; latestBuildTime: string };

/** Compare immutable build identity, not the time at which this check runs. */
export const compareWebVersion = (remote: unknown): WebUpdateInfo => {
  const manifest = remote as Record<string, unknown> | null;
  if (!manifest || typeof manifest.version !== 'string' || !manifest.version.trim()
    || typeof manifest.buildTimestamp !== 'string' || !Number.isFinite(Date.parse(manifest.buildTimestamp))) {
    throw new Error('Der Server hat keine gültigen Versionsangaben geliefert.');
  }
  const remoteRevision = typeof manifest.revision === 'string' ? manifest.revision : '';
  return {
    hasUpdate: RELEASE_REVISION && remoteRevision
      ? remoteRevision !== RELEASE_REVISION
      : Date.parse(manifest.buildTimestamp) > Date.parse(BUILD_TIMESTAMP),
    latestVersion: manifest.version,
    latestBuildTime: new Date(manifest.buildTimestamp).toLocaleString('de-DE'),
  };
};

/** Web updates only. A native binary must be updated through its store channel. */
export const checkForUpdates = async (): Promise<WebUpdateInfo> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(new URL('/version.json', window.location.origin), {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error('Die Versionsprüfung ist momentan nicht erreichbar. Bitte versuche es erneut.');
    }
    return compareWebVersion(await response.json());
  } finally {
    clearTimeout(timeout);
  }
};

