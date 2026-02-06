import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const devLog = (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args); };
const devError = (...args: unknown[]) => { if (import.meta.env.DEV) console.error(...args); };

let isInitialized = false;

/** Reset so next enable runs full init and register() fires again (call when user disables push). */
export const resetPushInitializationState = () => {
  isInitialized = false;
};

/** Unregister from FCM on device and remove all listeners so next enable gets a clean state. */
export const unregisterPushOnDevice = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.removeAllListeners();
    devLog('[PushNotifications] All listeners removed');
    await PushNotifications.unregister();
    devLog('[PushNotifications] Unregistered on device (FCM token invalidated)');
  } catch (error) {
    devError('[PushNotifications] Error unregistering on device:', error);
  }
};

/** Optional session to pass so registerPushToken doesn't need getSession() (avoids hang/timeout when re-enabling). */
export type SessionForPush = { access_token: string; user: { id: string } };

export const initializePushNotifications = async (sessionOverride?: SessionForPush) => {
  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    devLog('[PushNotifications] Not a native platform, skipping initialization');
    return;
  }

  devLog('[PushNotifications] Starting initialization...');

  try {
    // Check if PushNotifications plugin is available
    if (!PushNotifications) {
      devWarn('[PushNotifications] Plugin not available');
      return;
    }

    // Check current permission status
    let permStatus;
    try {
      permStatus = await PushNotifications.checkPermissions();
      devLog('[PushNotifications] Permission status:', permStatus);
    } catch (error) {
      devError('[PushNotifications] Error checking permissions:', error);
      return;
    }
    
    // If permission is not granted, don't initialize
    if (permStatus.receive !== 'granted') {
      devWarn('[PushNotifications] Permission not granted:', permStatus.receive);
      return;
    }

    // Reset initialization flag if permission was just granted
    // This allows re-initialization after user grants permission
    if (isInitialized) {
      devLog('[PushNotifications] Already initialized, but re-initializing due to permission grant');
      isInitialized = false;
    }

    // Add listeners BEFORE register() so we don't miss the 'registration' event
    // Pass sessionOverride so registerPushToken doesn't hang on getSession() when re-enabling from Profile
    PushNotifications.addListener('registration', async (token) => {
      devLog('[PushNotifications] Registration token:', token.value);
      await registerPushToken(token.value, sessionOverride);
    });

    PushNotifications.addListener('registrationError', (error) => {
      devError('[PushNotifications] Registration error:', error);
      toast.error('Fehler bei Push-Benachrichtigungen', {
        description: error.error,
      });
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      devLog('[PushNotifications] Push notification received:', notification);
      toast.info(notification.title || 'Neue Benachrichtigung', {
        description: notification.body,
        duration: 5000,
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      devLog('[PushNotifications] Push notification action performed:', action);
      if (action.notification.data?.action_url) {
        window.location.href = action.notification.data.action_url;
      }
    });

    // Register AFTER listeners so 'registration' event is received
    devLog('[PushNotifications] Registering for push notifications...');
    try {
      await PushNotifications.register();
      devLog('[PushNotifications] Registration call completed');
    } catch (error) {
      devError('[PushNotifications] Error registering:', error);
      return;
    }

    isInitialized = true;
    devLog('[PushNotifications] Initialized successfully');
  } catch (error) {
    devError('[PushNotifications] Initialization error:', error);
    // Don't crash the app - just log the error
    // User can enable push notifications manually in settings if they want
  }
};

export const registerPushToken = async (token: string, sessionOverride?: SessionForPush) => {
  try {
    devLog('[PushNotifications] 🔑 registerPushToken called with token:', token.substring(0, 20) + '...');
    
    let session: SessionForPush | null = sessionOverride ?? null;
    
    if (!session) {
      // CRITICAL: Get session for RLS with timeout to avoid hanging after reload
      devLog('[PushNotifications] 🔍 Getting session for token registration...');
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
      );
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
      } catch (timeoutError) {
        devError('[PushNotifications] ❌ Session timeout during token registration:', timeoutError);
        throw new Error('Session timeout - please try again');
      }
      
      const { data: { session: s }, error: sessionError } = sessionResult as any;
      
      if (sessionError) {
        devError('[PushNotifications] ❌ Error getting session:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      session = s;
    }
    
    if (!session?.user) {
      devWarn('[PushNotifications] ⚠️ No user logged in, skipping token registration');
      return;
    }
    
    devLog('[PushNotifications] ✅ Session found for user:', session.user.id);

    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    const deviceId = await getDeviceId();

    // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase-Konfiguration fehlt');
    }

    // Check if token already exists
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}&select=id`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (checkResponse.ok) {
      const existingTokens = await checkResponse.json();
      const existingToken = Array.isArray(existingTokens) && existingTokens.length > 0 ? existingTokens[0] : null;

      if (existingToken) {
        // Update last_used_at
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/push_tokens?id=eq.${existingToken.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ last_used_at: new Date().toISOString() }),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`HTTP ${updateResponse.status}: ${errorText}`);
        }
      } else {
        // Insert new token
        const insertResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/push_tokens`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              user_id: session.user.id,
              token,
              platform,
              device_id: deviceId,
            }),
          }
        );

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          throw new Error(`HTTP ${insertResponse.status}: ${errorText}`);
        }
      }

      devLog('[PushNotifications] ✅ Token registered successfully');
      devLog('[PushNotifications] 📋 Token details:', {
        platform,
        deviceId,
        tokenPrefix: token.substring(0, 20) + '...',
        userId: session.user.id
      });
    } else {
      const errorText = await checkResponse.text();
      devError('[PushNotifications] ❌ Error checking token:', checkResponse.status, errorText);
      throw new Error(`HTTP ${checkResponse.status}: ${errorText}`);
    }
  } catch (error: any) {
    devError('[PushNotifications] ❌ Error registering push token:', error);
    devError('[PushNotifications] ❌ Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    // Don't throw - token registration failure shouldn't crash the app
  }
};

export const unregisterPushToken = async (token: string) => {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);

    if (error) {
      devError('[PushNotifications] Error unregistering token:', error);
      throw error;
    }

    devLog('[PushNotifications] Token unregistered successfully');
  } catch (error) {
    devError('[PushNotifications] Error unregistering push token:', error);
  }
};

/** Delete all push tokens for a user (e.g. when they disable push notifications). */
export const deletePushTokensForUser = async (userId: string, accessToken: string): Promise<void> => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
      }
    );
    if (!response.ok) {
      devError('[PushNotifications] Error deleting push tokens for user:', await response.text());
      return;
    }
    devLog('[PushNotifications] Push tokens deleted for user');
  } catch (error) {
    devError('[PushNotifications] Error deleting push tokens for user:', error);
  }
};

/**
 * Explicitly request FCM token and register it (e.g. after user re-enables push).
 * After unregister() on disable, register() gets a fresh token and fires 'registration'.
 */
export const requestTokenAndRegister = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  let resolveWaiting: () => void;
  const waiting = new Promise<void>((r) => { resolveWaiting = r; });
  const handle = await PushNotifications.addListener('registration', async (t: { value: string }) => {
    await registerPushToken(t.value);
    resolveWaiting();
  });
  const timeout = setTimeout(resolveWaiting, 5000);
  PushNotifications.register().then(() => {}).catch(resolveWaiting);
  await waiting;
  clearTimeout(timeout);
  await handle.remove().catch(() => {});
};

const getDeviceId = async (): Promise<string> => {
  // Try to get a unique device ID
  // For now, use a combination of platform and a random ID stored in localStorage
  const storageKey = 'device_id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    deviceId = `${Capacitor.getPlatform()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
};

export const requestPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // For web, use browser Notification API
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  try {
    const permStatus = await PushNotifications.requestPermissions();
    return permStatus.receive === 'granted';
  } catch (error) {
    devError('[PushNotifications] Error requesting permission:', error);
    return false;
  }
};

/** Get current push permission status (native only). For debugging why push might not work. */
export const getPushPermissionStatus = async (): Promise<'granted' | 'denied' | 'prompt' | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const permStatus = await PushNotifications.checkPermissions();
    return (permStatus.receive as 'granted' | 'denied' | 'prompt') ?? null;
  } catch {
    return null;
  }
};