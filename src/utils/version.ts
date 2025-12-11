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
export const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion?: string; latestBuildTime?: string }> => {
  try {
    // In production, check against a version.json file on the server
    if (import.meta.env.PROD) {
      const versionUrl = `${window.location.origin}/version.json`;
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Update check timeout')), 5000);
      });
      
      const fetchPromise = fetch(versionUrl, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (response.ok) {
        const remoteVersion = await response.json();
        const currentTimestamp = new Date(BUILD_TIMESTAMP).getTime();
        const remoteTimestamp = new Date(remoteVersion.buildTimestamp).getTime();
        
        return {
          hasUpdate: remoteTimestamp > currentTimestamp,
          latestVersion: remoteVersion.version,
          latestBuildTime: remoteVersion.buildDate,
        };
      }
    }
    
    return { hasUpdate: false };
  } catch (error) {
    console.warn('[Version] Error checking for updates:', error);
    return { hasUpdate: false };
  }
};

