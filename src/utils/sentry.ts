import * as Sentry from '@sentry/capacitor';
import { init as sentryReactInit } from '@sentry/react';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '@/utils/version';

let initialized = false;

function getSentryDsn(): string | undefined {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  return typeof dsn === 'string' && dsn.trim().length > 0 ? dsn.trim() : undefined;
}

export function isSentryEnabled(): boolean {
  return Boolean(getSentryDsn());
}

/**
 * Initialize Sentry only when VITE_SENTRY_DSN is set. Fail-open: never throw.
 * Uses @sentry/capacitor so native iOS crashes and OOM/watchdog heuristics are captured.
 */
export function initSentry(): void {
  if (initialized) return;

  const dsn = getSentryDsn();
  if (!dsn) return;

  try {
    const environment =
      import.meta.env.VITE_SENTRY_ENVIRONMENT ||
      (Capacitor.isNativePlatform() ? 'testflight' : import.meta.env.MODE);

    Sentry.init(
      {
        dsn,
        environment,
        release: `kws-beta-app@${APP_VERSION}`,
        tracesSampleRate: 0,
        // Session Replay stays off — especially important during video compress/upload.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        sendDefaultPii: false,
        enableNative: true,
        enableNativeCrashHandling: true,
        enableAutoSessionTracking: true,
        enableOutOfMemoryTracking: true,
        beforeSend(event) {
          if (event.request) {
            delete event.request.cookies;
            delete event.request.data;
          }
          return event;
        },
      },
      // Sibling JS SDK init (required by @sentry/capacitor)
      sentryReactInit,
    );

    Sentry.setTag('platform', Capacitor.getPlatform());
    Sentry.setTag('app_version', APP_VERSION);
    initialized = true;
  } catch (error) {
    console.warn('[Sentry] Init failed (ignored):', error);
  }
}

export function setSentryUser(
  user: { id: string; email?: string | null; role?: string | null } | null,
): void {
  if (!isSentryEnabled() || !initialized) return;
  try {
    if (!user) {
      Sentry.setUser(null);
      Sentry.setTag('role', 'anonymous');
      return;
    }
    Sentry.setUser({ id: user.id });
    if (user.role) {
      Sentry.setTag('role', user.role);
    }
  } catch {
    // fail-open
  }
}

export function addSentryBreadcrumb(
  message: string,
  category = 'app',
  data?: Record<string, string | number | boolean | null | undefined>,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (!isSentryEnabled() || !initialized) return;
  try {
    const safeData: Record<string, string | number | boolean> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && (value.includes('Bearer ') || value.length > 200)) continue;
        safeData[key] = value;
      }
    }
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data: safeData,
    });
  } catch {
    // fail-open
  }
}

export function captureSentryException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): void {
  if (!isSentryEnabled() || !initialized) return;
  try {
    const err = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
    Sentry.withScope((scope) => {
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }
      if (context?.extra) {
        scope.setExtras(context.extra);
      }
      Sentry.captureException(err);
    });
  } catch {
    // fail-open
  }
}

/** Best-effort flush before risky native/compress steps. */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!isSentryEnabled() || !initialized) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // fail-open
  }
}