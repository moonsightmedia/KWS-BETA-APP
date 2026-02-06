import { supabase } from '@/integrations/supabase/client';

const devLog = (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args); };
const devError = (...args: unknown[]) => { if (import.meta.env.DEV) console.error(...args); };

/**
 * Service for sending push notifications
 * 
 * This service handles the delivery of push notifications to devices.
 * 
 * Implementation options:
 * 1. Supabase Edge Function (recommended)
 * 2. External service (OneSignal, Firebase Admin SDK)
 * 3. Browser Notification API for web
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
}

/**
 * Send push notification to a user
 * This should be called after creating a notification in the database
 */
export const sendPushNotification = async (
  userId: string,
  payload: PushNotificationPayload,
  sessionOverride?: any
): Promise<void> => {
  devLog('[PushNotifications] 🔔 sendPushNotification called:', { userId, payload });
  try {
    // CRITICAL: Get session for RLS
    devLog('[PushNotifications] 🔍 Getting session...');
    
    let session = sessionOverride;
    
    // If no session provided, try to get it (with timeout to prevent hanging)
    if (!session) {
      devLog('[PushNotifications] No session provided, fetching...');
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
      );
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
      } catch (timeoutError) {
        devError('[PushNotifications] ❌ Session timeout:', timeoutError);
        throw new Error('Session timeout - please try again');
      }
      
      const { data: { session: fetchedSession }, error: sessionError } = sessionResult as any;
      
      if (sessionError) {
        devError('[PushNotifications] ❌ Error getting session:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      session = fetchedSession;
    }
    
    if (!session) {
      devWarn('[PushNotifications] ❌ No session, skipping push notification');
      throw new Error('No active session found');
    }
    
    devLog('[PushNotifications] ✅ Session found:', { userId: session.user?.id });

    // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase-Konfiguration fehlt');
    }

    // Check if user has push notifications enabled
    const preferencesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notification_preferences?user_id=eq.${userId}&select=push_enabled`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!preferencesResponse.ok) {
      devError('[PushNotifications] Error fetching preferences:', await preferencesResponse.text());
      return;
    }

    const preferencesArray = await preferencesResponse.json();
    const preferences = Array.isArray(preferencesArray) && preferencesArray.length > 0 ? preferencesArray[0] : null;

    devLog('[PushNotifications] 📋 Preferences:', preferences);

    if (!preferences?.push_enabled) {
      devLog('[PushNotifications] ❌ User has push notifications disabled');
      return;
    }
    devLog('[PushNotifications] ✅ Push notifications enabled');

    // Get all push tokens for the user
    const tokensResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}&select=token,platform`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tokensResponse.ok) {
      devError('[PushNotifications] Error fetching tokens:', await tokensResponse.text());
      return;
    }

    const tokensArray = await tokensResponse.json();
    const tokens = Array.isArray(tokensArray) ? tokensArray : [];

    devLog('[PushNotifications] 🔑 Tokens found:', tokens.length, tokens);

    if (tokens.length === 0) {
      devLog('[PushNotifications] ❌ No push tokens found for user');
      return;
    }
    devLog('[PushNotifications] ✅ Push tokens available');

    // Call Supabase Edge Function to send push notification
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/send-push-notification`;
    const requestBody = {
      tokens: tokens.map(t => ({ token: t.token, platform: t.platform })),
      payload: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        action_url: payload.action_url,
      },
    };
    
    devLog('[PushNotifications] 📤 Calling Edge Function:', edgeFunctionUrl);
    devLog('[PushNotifications] 📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const edgeFunctionResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await edgeFunctionResponse.text();
    devLog('[PushNotifications] 📥 Edge Function response:', {
      status: edgeFunctionResponse.status,
      ok: edgeFunctionResponse.ok,
      body: responseText,
    });

    if (!edgeFunctionResponse.ok) {
      devError('[PushNotifications] ❌ Error calling Edge Function:', responseText);
      throw new Error(`Edge Function error: ${responseText}`);
    }

    const responseData = JSON.parse(responseText);
    devLog('[PushNotifications] 📥 Edge Function response data:', JSON.stringify(responseData, null, 2));
    
    // Prüfe ob FCM erfolgreich war und lösche ungültige Tokens
    const invalidTokens: string[] = [];
    if (responseData.results && Array.isArray(responseData.results)) {
      responseData.results.forEach((result: any, index: number) => {
        if (result.success) {
          devLog(`[PushNotifications] ✅ Result ${index + 1} (${result.platform}): Success`, result.result);
        } else {
          devError(`[PushNotifications] ❌ Result ${index + 1} (${result.platform}): Failed`, result.error || result.result);
          
          // Check if token is invalid (UNREGISTERED, INVALID_ARGUMENT, etc.)
          const errorStr = JSON.stringify(result.error || result.result || '');
          if (errorStr.includes('UNREGISTERED') || errorStr.includes('INVALID_ARGUMENT') || errorStr.includes('NOT_FOUND')) {
            devWarn(`[PushNotifications] ⚠️ Token ${index + 1} is invalid, will be deleted:`, result.token);
            if (result.token) {
              invalidTokens.push(result.token);
            }
          }
        }
      });
    }
    
    // Delete invalid tokens from database
    if (invalidTokens.length > 0) {
      devLog(`[PushNotifications] 🗑️ Deleting ${invalidTokens.length} invalid token(s)...`);
      for (const invalidToken of invalidTokens) {
        try {
          await deleteInvalidToken(invalidToken, session);
        } catch (deleteError) {
          devError(`[PushNotifications] ❌ Error deleting invalid token:`, deleteError);
        }
      }
    }
    
    devLog('[PushNotifications] ✅ Push notification sent successfully:', {
      userId,
      tokens: tokens.length,
      invalidTokensDeleted: invalidTokens.length,
      payload,
      response: responseData,
    });
  } catch (error: any) {
    devError('[PushNotifications] ❌ Error sending push notification:', error);
    devError('[PushNotifications] ❌ Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    // Re-throw to let caller handle it
    throw error;
  }
};

/**
 * Delete an invalid push token from the database
 */
const deleteInvalidToken = async (token: string, session: any): Promise<void> => {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase-Konfiguration fehlt');
    }

    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      devError('[PushNotifications] Error deleting token:', errorText);
      throw new Error(`HTTP ${deleteResponse.status}: ${errorText}`);
    }

    devLog(`[PushNotifications] ✅ Invalid token deleted: ${token.substring(0, 20)}...`);
  } catch (error) {
    devError('[PushNotifications] Error deleting invalid token:', error);
    throw error;
  }
};

/**
 * Send push notification after creating a database notification
 * This should be called from database triggers or application code
 */
export const sendPushNotificationForNotification = async (
  notificationId: string,
  sessionOverride?: any
): Promise<void> => {
  devLog('[PushNotifications] 🔔 sendPushNotificationForNotification called:', notificationId);
  try {
    // CRITICAL: Get session for RLS
    let session = sessionOverride;
    
    if (!session) {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
      );
      try {
        const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: any } };
        session = result?.data?.session;
      } catch (e) {
        devWarn('[PushNotifications] Session fetch timed out or failed, skipping push');
        return;
      }
    }

    if (!session) {
      devWarn('[PushNotifications] ❌ No session, skipping push notification');
      return;
    }

    // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase-Konfiguration fehlt');
    }

    // Get notification details
    const notificationResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?id=eq.${notificationId}&select=user_id,title,message,data,action_url`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!notificationResponse.ok) {
      const errorText = await notificationResponse.text();
      devError('[PushNotifications] Error fetching notification:', errorText);
      return;
    }

    const notificationArray = await notificationResponse.json();
    const notification = Array.isArray(notificationArray) && notificationArray.length > 0 ? notificationArray[0] : null;

    devLog('[PushNotifications] 📋 Notification fetched:', notification);

    if (!notification) {
      devError('[PushNotifications] ❌ Notification not found');
      return;
    }

    devLog('[PushNotifications] 📤 Calling sendPushNotification for user:', notification.user_id);
    await sendPushNotification(notification.user_id, {
      title: notification.title,
      body: notification.message,
      data: notification.data || {},
      action_url: notification.action_url || undefined,
    }, session); // Pass session to avoid re-fetching
  } catch (error) {
    devError('[PushNotifications] Error sending push for notification:', error);
  }
};

