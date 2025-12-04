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
 * Submits feedback to the database
 */
export async function submitFeedback(data: FeedbackData): Promise<{ success: boolean; error?: string }> {
  try {
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
    
    // Handle screenshot
    if (data.screenshot_url) {
      // If it's a data URL, try to upload it
      if (data.screenshot_url.startsWith('data:')) {
        const uploadedUrl = await uploadScreenshot(data.screenshot_url);
        feedbackPayload.screenshot_url = uploadedUrl;
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
  } catch (error: any) {
    console.error('[Feedback] Exception submitting feedback:', error);
    return { success: false, error: error.message || 'Unknown error' };
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

