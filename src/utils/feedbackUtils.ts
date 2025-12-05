import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

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

/**
 * Captures a screenshot of the current page
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      logging: false,
      scale: 0.5, // Reduce size for performance
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[Feedback] Error capturing screenshot:', error);
    return null;
  }
}

/**
 * Uploads screenshot to Supabase Storage and returns URL
 */
async function uploadScreenshot(screenshotDataUrl: string): Promise<string | null> {
  try {
    // Convert data URL to blob
    const response = await fetch(screenshotDataUrl);
    const blob = await response.blob();
    
    // Generate unique filename
    const filename = `feedback-screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('feedback-screenshots')
      .upload(filename, blob, {
        contentType: 'image/png',
        upsert: false,
      });
    
    if (error) {
      console.error('[Feedback] Error uploading screenshot:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('feedback-screenshots')
      .getPublicUrl(filename);
    
    return urlData.publicUrl;
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
    
    for (let i = 0; i < pendingFeedback.length; i++) {
      const item = pendingFeedback[i];
      // Skip if retry count is too high (max 3 retries)
      if (item.retryCount >= 3) {
        console.warn(`[Feedback] Skipping feedback ${i} - too many retries`);
        continue;
      }

      try {
        // Create a timeout promise (10 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 10000);
        });

        // Race between feedback submission and timeout
        const result = await Promise.race([
          submitFeedback(item),
          timeoutPromise,
        ]);

        if (result.success) {
          successful.push(i);
        } else {
          // Increment retry count
          item.retryCount = (item.retryCount || 0) + 1;
        }
      } catch (error) {
        console.error(`[Feedback] Error retrying feedback ${i}:`, error);
        item.retryCount = (item.retryCount || 0) + 1;
      }
    }

    // Remove successfully sent feedback
    const remaining = pendingFeedback.filter((_: any, i: number) => !successful.includes(i));
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

/**
 * Submits feedback to the database
 * Includes timeout protection and localStorage fallback
 */
export async function submitFeedback(data: FeedbackData): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a timeout promise (15 seconds)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Feedback submission timeout after 15 seconds')), 15000);
    });

    // Race between feedback submission and timeout
    const result = await Promise.race([
      (async () => {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        
        // Prepare feedback payload
        const feedbackPayload: any = {
          type: data.type,
          title: data.title,
          description: data.description,
          user_id: user?.id || null,
          user_email: data.user_email || user?.email || null,
          priority: data.priority || 'medium',
          browser_info: data.browser_info || getBrowserInfo(),
          url: data.url || window.location.href,
          error_details: data.error_details || null,
          metadata: data.metadata || {},
        };
        
        // Handle screenshot (with timeout protection)
        if (data.screenshot_url) {
          // If it's a data URL, try to upload it
          if (data.screenshot_url.startsWith('data:')) {
            try {
              const uploadTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Screenshot upload timeout')), 10000);
              });
              const uploadedUrl = await Promise.race([
                uploadScreenshot(data.screenshot_url),
                uploadTimeout,
              ]);
              feedbackPayload.screenshot_url = uploadedUrl;
            } catch (uploadError) {
              console.warn('[Feedback] Screenshot upload failed or timed out, continuing without screenshot');
              // Continue without screenshot
            }
          } else {
            feedbackPayload.screenshot_url = data.screenshot_url;
          }
        }
        
        // Insert feedback
        const { error } = await supabase
          .from('feedback')
          .insert([feedbackPayload]);
        
        if (error) {
          console.error('[Feedback] Error submitting feedback:', error);
          return { success: false, error: error.message };
        }
        
        return { success: true };
      })(),
      timeoutPromise,
    ]);

    return result;
  } catch (error: any) {
    console.error('[Feedback] Exception submitting feedback:', error);
    
    // Store in localStorage as fallback
    storeFeedbackInLocalStorage(data);
    
    // If it's a timeout, return a specific error message
    if (error.message?.includes('timeout')) {
      return { 
        success: false, 
        error: 'Die Verbindung dauert zu lange. Das Feedback wurde gespeichert und wird später automatisch gesendet.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Unknown error. Das Feedback wurde gespeichert und wird später automatisch gesendet.' 
    };
  }
}

/**
 * Automatically reports an error
 */
export async function reportError(
  error: Error,
  errorInfo?: React.ErrorInfo,
  userDescription?: string
): Promise<void> {
  try {
    // Capture screenshot
    const screenshot = await captureScreenshot();
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    // Prepare error details
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      name: error.name,
    };
    
    // Determine priority based on error type
    let priority: FeedbackPriority = 'medium';
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      priority = 'high';
    } else if (error.message.includes('Storage') || error.message.includes('localStorage')) {
      priority = 'low';
    }
    
    // Submit feedback
    const description = userDescription 
      ? `${userDescription}\n\nAutomatisch gemeldeter Fehler:\n${error.message}`
      : `Automatisch gemeldeter Fehler: ${error.message}`;
    
    await submitFeedback({
      type: 'error',
      title: `Fehler: ${error.message.substring(0, 100)}`,
      description,
      priority,
      error_details: errorDetails,
      screenshot_url: screenshot || undefined,
      metadata: {
        autoReported: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (reportError) {
    // Silently fail - we don't want error reporting to cause more errors
    console.error('[Feedback] Error reporting error:', reportError);
  }
}

