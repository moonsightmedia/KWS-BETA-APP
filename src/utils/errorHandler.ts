import { toast } from 'sonner';
import { reportError, type ReportErrorUserContext } from './feedbackUtils';

let errorHandlerInitialized = false;
let currentUserContext: ReportErrorUserContext | null = null;

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
    reportError(error, {
      componentStack: event.error?.stack || '',
    }, undefined, currentUserContext ?? undefined)
      .then(() => {
        toast.info('Ein Fehler ist aufgetreten und wurde automatisch gemeldet.');
      })
      .catch(() => {
        // Silently fail
      });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason || 'Unhandled promise rejection'));

    reportError(error, undefined, undefined, currentUserContext ?? undefined)
      .then(() => {
        toast.info('Ein Fehler ist aufgetreten und wurde automatisch gemeldet.');
      })
      .catch(() => {
        // Silently fail
      });
  });
}

/**
 * Cleans up error handlers (useful for testing)
 */
export function cleanupErrorHandler(): void {
  errorHandlerInitialized = false;
  // Note: We don't remove listeners as they're global
}

