import { toast } from 'sonner';
import { reportError, type ReportErrorUserContext } from './feedbackUtils';

let errorHandlerInitialized = false;
let currentUserContext: ReportErrorUserContext | null = null;

/**
 * Checks if an error is an AbortError (e.g., from fetch abort or navigation).
 * These are expected and should not be reported as bugs.
 */
function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'AbortError' ||
    error.message?.includes('AbortError') ||
    error.message?.includes('The operation was aborted')
  );
}

/**
 * Checks if an error is a network error that should not be reported.
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message?.toLowerCase() || '';
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch')
  );
}

/**
 * Determines if an error should be reported to the feedback system.
 * Filters out expected errors like AbortErrors and transient network issues.
 */
function shouldReportError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  // Note: We still report network errors that are unexpected
  // Only skip AbortErrors which are expected during navigation
  return true;
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
    
    // Skip AbortErrors - these are expected during navigation
    if (isAbortError(error)) {
      if (import.meta.env.DEV) {
        console.log('[ErrorHandler] Ignoring AbortError (expected during navigation)');
      }
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
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason || 'Unhandled promise rejection'));

    // Skip AbortErrors - these are expected during navigation
    if (isAbortError(error)) {
      if (import.meta.env.DEV) {
        console.log('[ErrorHandler] Ignoring AbortError from unhandled rejection (expected during navigation)');
      }
      return;
    }

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
