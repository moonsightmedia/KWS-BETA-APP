import html2canvas from 'html2canvas';

export type FeedbackType = 'error' | 'bug' | 'feature' | 'general' | 'other';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  timezone: string;
  cookieEnabled: boolean;
  online: boolean;
}

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  name?: string;
}

export interface FeedbackData {
  type: FeedbackType;
  title: string;
  description: string;
  user_id?: string | null;
  user_email?: string | null;
  priority?: FeedbackPriority;
  browser_info?: BrowserInfo;
  url?: string;
  screenshot_url?: string;
  error_details?: ErrorDetails;
  metadata?: Record<string, unknown>;
}

/**
 * Collects browser and environment information
 */
export function getBrowserInfo(): BrowserInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookieEnabled: navigator.cookieEnabled,
    online: navigator.onLine,
  };
}

// Skalierung: devicePixelRatio für scharfe Texte, max 2 um Dateigröße zu begrenzen
const getScreenshotScale = () =>
  typeof window !== 'undefined'
    ? Math.min(2, Math.max(1, window.devicePixelRatio || 1))
    : 1;

/**
 * Captures a screenshot of the visible viewport only (what the user actually sees).
 * Waits for fonts, uses foreignObject for native text rendering where supported.
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    if (document.fonts?.ready) await document.fonts.ready;

    const vv = typeof window !== 'undefined' && window.visualViewport;
    const width = Math.floor(vv ? vv.width : window.innerWidth);
    const height = Math.floor(vv ? vv.height : window.innerHeight);
    const x = Math.floor(vv ? window.scrollX + vv.offsetLeft : window.scrollX);
    const y = Math.floor(vv ? window.scrollY + vv.offsetTop : window.scrollY);
    const scale = getScreenshotScale();

    const baseOptions = {
      useCORS: true,
      logging: false,
      scale,
      windowWidth: width,
      windowHeight: height,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      x,
      y,
      width,
      height,
      ignoreElements: (element: Element) => !!element.closest?.('[data-feedback-overlay]'),
    };

    try {
      const canvas = await html2canvas(document.body, {
        ...baseOptions,
        foreignObjectRendering: true,
      });
      return canvas.toDataURL('image/png');
    } catch {
      const canvas = await html2canvas(document.body, baseOptions);
      return canvas.toDataURL('image/png');
    }
  } catch (error) {
    console.error('[Feedback] Error capturing screenshot:', error);
    return null;
  }
}

/**
 * Uploads screenshot to Supabase Storage via REST API (avoids client hang).
 * Returns public URL or null on failure.
 */
async function uploadScreenshot(screenshotDataUrl: string): Promise<string | null> {
  try {
    const response = await fetch(screenshotDataUrl);
    const blob = await response.blob();
    const filename = `feedback-screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Feedback] Missing Supabase env for screenshot upload');
      return null;
    }

    const uploadUrl = `${supabaseUrl}/storage/v1/object/feedback-screenshots/${filename}`;
    const res = await window.fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'image/png',
      },
      body: blob,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Feedback] Screenshot upload failed:', res.status, errText);
      return null;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/feedback-screenshots/${filename}`;
    return publicUrl;
  } catch (error) {
    console.error('[Feedback] Error uploading screenshot:', error);
    return null;
  }
}

/**
 * Stores feedback in localStorage as fallback when API call fails
 */
function storeFeedbackInLocalStorage(data: FeedbackData): void {
  try {
    const pendingFeedback = JSON.parse(localStorage.getItem('pendingFeedback') || '[]');
    pendingFeedback.push({
      ...data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
    localStorage.setItem('pendingFeedback', JSON.stringify(pendingFeedback));
    console.log('[Feedback] Stored feedback in localStorage as fallback');
  } catch (e) {
    console.error('[Feedback] Could not store feedback in localStorage:', e);
  }
}

/**
 * Retries sending pending feedback from localStorage
 */
export async function retryPendingFeedback(): Promise<void> {
  try {
    const pendingFeedback = JSON.parse(localStorage.getItem('pendingFeedback') || '[]');
    if (pendingFeedback.length === 0) return;

    const successful: number[] = [];
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingFeedback.length; i++) {
      const item = pendingFeedback[i];
      if (item.retryCount >= 3) {
        skippedCount++;
        continue;
      }

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 8000);
        });
        const result = await Promise.race([
          submitFeedback(item, { skipScreenshot: true }),
          timeoutPromise,
        ]);

        if (result.success) {
          successful.push(i);
        } else {
          item.retryCount = (item.retryCount || 0) + 1;
          failedCount++;
        }
      } catch {
        item.retryCount = (item.retryCount || 0) + 1;
        failedCount++;
      }
    }

    if (skippedCount > 0) {
      console.warn(`[Feedback] ${skippedCount} pending items skipped (too many retries)`);
    }
    if (failedCount > 0 && import.meta.env.DEV) {
      console.warn(`[Feedback] ${failedCount} pending items failed to send this time`);
    }

    // Nur noch versuchen: nicht erfolgreich UND noch Retries übrig (retryCount < 3)
    const remaining = pendingFeedback.filter(
      (item: { retryCount?: number }, idx: number) =>
        !successful.includes(idx) && (item.retryCount ?? 0) < 3
    );
    if (remaining.length > 0) {
      localStorage.setItem('pendingFeedback', JSON.stringify(remaining));
    } else {
      localStorage.removeItem('pendingFeedback');
    }

    if (successful.length > 0) {
      console.log(`[Feedback] Successfully retried ${successful.length} pending feedback items`);
    }
  } catch (e) {
    console.error('[Feedback] Error retrying pending feedback:', e);
  }
}

export interface SubmitFeedbackOptions {
  /** When true, skip screenshot upload (e.g. for retrying pending feedback) to avoid timeouts */
  skipScreenshot?: boolean;
}

/**
 * Submits feedback to the database via direct REST fetch to avoid Supabase client hang.
 * Includes timeout protection and localStorage fallback.
 */
export async function submitFeedback(
  data: FeedbackData,
  options?: SubmitFeedbackOptions
): Promise<{ success: boolean; error?: string }> {
  const fromRetry = (data as { retryCount?: number }).retryCount != null;
  const skipScreenshot = options?.skipScreenshot ?? fromRetry;
  const timeoutMs = skipScreenshot ? 8000 : 15000;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Feedback submission timeout after ' + timeoutMs / 1000 + ' seconds')), timeoutMs);
    });

    const result = await Promise.race([
      (async () => {
        const feedbackPayload: Record<string, unknown> = {
          type: data.type,
          title: data.title,
          description: data.description,
          user_id: data.user_id ?? null,
          user_email: data.user_email ?? null,
          priority: data.priority || 'medium',
          browser_info: data.browser_info || getBrowserInfo(),
          url: data.url || window.location.href,
          error_details: data.error_details || null,
          metadata: data.metadata || {},
        };

        if (!skipScreenshot && data.screenshot_url) {
          if (data.screenshot_url.startsWith('data:')) {
            try {
              const uploadTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Screenshot upload timeout')), 5000);
              });
              const uploadedUrl = await Promise.race([
                uploadScreenshot(data.screenshot_url),
                uploadTimeout,
              ]);
              if (uploadedUrl) feedbackPayload.screenshot_url = uploadedUrl;
            } catch {
              console.warn('[Feedback] Screenshot upload failed or timed out, continuing without screenshot');
            }
          } else {
            feedbackPayload.screenshot_url = data.screenshot_url;
          }
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return { success: false, error: 'Missing Supabase env' };
        }
        const res = await window.fetch(`${supabaseUrl}/rest/v1/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(feedbackPayload),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('[Feedback] Error submitting feedback:', res.status, errText);
          return { success: false, error: errText || res.statusText };
        }
        return { success: true };
      })(),
      timeoutPromise,
    ]);

    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const isTimeout = msg.includes('timeout');
    if (isTimeout) {
      console.warn('[Feedback] Submission timed out (will retry later)');
    } else {
      console.error('[Feedback] Exception submitting feedback:', error);
    }
    if (!fromRetry) {
      storeFeedbackInLocalStorage(data);
    }
    return {
      success: false,
      error: isTimeout
        ? 'Die Verbindung dauert zu lange. Das Feedback wurde gespeichert und wird später automatisch gesendet.'
        : msg || 'Unknown error. Das Feedback wurde gespeichert und wird später automatisch gesendet.',
    };
  }
}

/**
 * User context for error reports (passed from caller to avoid getSession() in utils)
 */
export interface ReportErrorUserContext {
  user_id?: string | null;
  user_email?: string | null;
}

/**
 * Reports an error as feedback. User context must be passed from caller (e.g. useAuth).
 */
export async function reportError(
  error: Error,
  errorInfo?: React.ErrorInfo,
  userDescription?: string,
  userContext?: ReportErrorUserContext | null
): Promise<void> {
  try {
    const screenshot = await captureScreenshot();
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      name: error.name,
    };
    let priority: FeedbackPriority = 'medium';
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      priority = 'high';
    } else if (error.message.includes('Storage') || error.message.includes('localStorage')) {
      priority = 'low';
    }
    const description = userDescription
      ? `${userDescription}\n\nAutomatisch gemeldeter Fehler:\n${error.message}`
      : `Automatisch gemeldeter Fehler: ${error.message}`;

    await submitFeedback({
      type: 'error',
      title: `Fehler: ${error.message.substring(0, 100)}`,
      description,
      priority,
      user_id: userContext?.user_id ?? null,
      user_email: userContext?.user_email ?? null,
      error_details: errorDetails,
      screenshot_url: screenshot || undefined,
      metadata: {
        autoReported: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Feedback] Error reporting error:', err);
  }
}

