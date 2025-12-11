import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let isInitialized = false;

export const initializePushNotifications = async () => {
  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('[PushNotifications] Not a native platform, skipping initialization');
    return;
  }

  console.log('[PushNotifications] Starting initialization...');

  try {
    // Check if PushNotifications plugin is available
    if (!PushNotifications) {
      console.warn('[PushNotifications] Plugin not available');
      return;
    }

    // Check current permission status
    let permStatus;
    try {
      permStatus = await PushNotifications.checkPermissions();
      console.log('[PushNotifications] Permission status:', permStatus);
    } catch (error) {
      console.error('[PushNotifications] Error checking permissions:', error);
      return;
    }
    
    // If permission is not granted, don't initialize
    if (permStatus.receive !== 'granted') {
      console.warn('[PushNotifications] Permission not granted:', permStatus.receive);
      return;
    }

    // Reset initialization flag if permission was just granted
    // This allows re-initialization after user grants permission
    if (isInitialized) {
      console.log('[PushNotifications] Already initialized, but re-initializing due to permission grant');
      isInitialized = false;
    }

    // Register for push notifications only if permission is granted
    console.log('[PushNotifications] Registering for push notifications...');
    try {
      await PushNotifications.register();
      console.log('[PushNotifications] Registration call completed');
    } catch (error) {
      console.error('[PushNotifications] Error registering:', error);
      return;
    }

    // Listen for registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('[PushNotifications] Registration token:', token.value);
      await registerPushToken(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PushNotifications] Registration error:', error);
      toast.error('Fehler bei Push-Benachrichtigungen', {
        description: error.error,
      });
    });

    // Listen for push notifications received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PushNotifications] Push notification received:', notification);
      toast.info(notification.title || 'Neue Benachrichtigung', {
        description: notification.body,
        duration: 5000,
      });
    });

    // Listen for push notification actions
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[PushNotifications] Push notification action performed:', action);
      // Handle navigation if needed
      if (action.notification.data?.action_url) {
        window.location.href = action.notification.data.action_url;
      }
    });

    isInitialized = true;
    console.log('[PushNotifications] Initialized successfully');
  } catch (error) {
    console.error('[PushNotifications] Initialization error:', error);
    // Don't crash the app - just log the error
    // User can enable push notifications manually in settings if they want
  }
};

export const registerPushToken = async (token: string) => {
  try {
    console.log('[PushNotifications] 🔑 registerPushToken called with token:', token.substring(0, 20) + '...');
    
    // CRITICAL: Get session for RLS with timeout to avoid hanging after reload
    console.log('[PushNotifications] 🔍 Getting session for token registration...');
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
    );
    
    let sessionResult;
    try {
      sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
    } catch (timeoutError) {
      console.error('[PushNotifications] ❌ Session timeout during token registration:', timeoutError);
      throw new Error('Session timeout - please try again');
    }
    
    const { data: { session }, error: sessionError } = sessionResult as any;
    
    if (sessionError) {
      console.error('[PushNotifications] ❌ Error getting session:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!session?.user) {
      console.warn('[PushNotifications] ⚠️ No user logged in, skipping token registration');
      return;
    }
    
    console.log('[PushNotifications] ✅ Session found for user:', session.user.id);

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

      console.log('[PushNotifications] ✅ Token registered successfully');
      console.log('[PushNotifications] 📋 Token details:', {
        platform,
        deviceId,
        tokenPrefix: token.substring(0, 20) + '...',
        userId: session.user.id
      });
    } else {
      const errorText = await checkResponse.text();
      console.error('[PushNotifications] ❌ Error checking token:', checkResponse.status, errorText);
      throw new Error(`HTTP ${checkResponse.status}: ${errorText}`);
    }
  } catch (error: any) {
    console.error('[PushNotifications] ❌ Error registering push token:', error);
    console.error('[PushNotifications] ❌ Error details:', {
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
      console.error('[PushNotifications] Error unregistering token:', error);
      throw error;
    }

    console.log('[PushNotifications] Token unregistered successfully');
  } catch (error) {
    console.error('[PushNotifications] Error unregistering push token:', error);
  }
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
    console.error('[PushNotifications] Error requesting permission:', error);
    return false;
  }
};

