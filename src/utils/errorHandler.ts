import { toast } from 'sonner';
import { reportError, type ReportErrorUserContext } from './feedbackUtils';
import { captureSentryException } from './sentry';

let errorHandlerInitialized = false;
let currentUserContext: ReportErrorUserContext | null = null;

function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  const message = String((error as { message?: string })?.message || error || '').toLowerCase();
  return message.includes('aborterror') || message.includes('signal is aborted');
}

/**
 * Sets the current user context for error reports (e.g. from App/useAuth).
 * Call this when the user logs in/out so global errors are attributed correctly.
 */
export function setErrorHandlerUserContext(ctx: ReportErrorUserContext | null): void {
  currentUserContext = ctx;
}

/**
 * Initializes global error handlers for unhandled errors and promise rejections.
 * Shows a toast to the user after reporting so normal users get feedback too.
 */
export function initializeErrorHandler(): void {
  if (errorHandlerInitialized) {
    return;
  }

  errorHandlerInitialized = true;

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    // Don't report errors from extensions or other sources
    if (event.filename && !event.filename.includes(window.location.origin)) {
      return;
    }

    const error = event.error || new Error(event.message || 'Unknown error');
    if (isAbortError(error)) {
      return;
    }

    reportError(error, {
      componentStack: event.error?.stack || '',
    }, undefined, currentUserContext ?? undefined)
      .then(() => {
        toast.info('Ein Fehler ist aufgetreten und wurde automatisch gemeldet.');
      })
      .catch(() => {
        // Silently fail
      });
    captureSentryException(error, { tags: { source: 'window.error' } });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason || 'Unhandled promise rejection'));

    if (isAbortError(error)) {
      return;
    }

    reportError(error, undefined, undefined, currentUserContext ?? undefined)
      .then(() => {
        toast.info('Ein Fehler ist aufgetreten und wurde automatisch gemeldet.');
      })
      .catch(() => {
        // Silently fail
      });
    captureSentryException(error, { tags: { source: 'unhandledrejection' } });
  });
}

/**
 * Cleans up error handlers (useful for testing)
 */
export function cleanupErrorHandler(): void {
  errorHandlerInitialized = false;
  // Note: We don't remove listeners as they're global
}
