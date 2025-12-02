import { reportError } from './feedbackUtils';

let errorHandlerInitialized = false;

/**
 * Initializes global error handlers for unhandled errors and promise rejections
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
    }).catch(() => {
      // Silently fail
    });
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason || 'Unhandled promise rejection'));
    
    reportError(error).catch(() => {
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

