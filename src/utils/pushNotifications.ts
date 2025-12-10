import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let isInitialized = false;

export const initializePushNotifications = async () => {
  // Only initialize on web platforms with Notification API support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.log('[PushNotifications] Not supported on this platform, skipping initialization');
    return;
  }

  if (isInitialized) {
    console.log('[PushNotifications] Already initialized');
    return;
  }

  try {
    // Check current permission status (don't request yet)
    let permStatus;
    try {
      permStatus = Notification.permission;
    } catch (error) {
      console.error('[PushNotifications] Error checking permissions:', error);
      return;
    }
    
    // Only request permission if not already granted/denied
    // Don't auto-request on app start - let user enable it manually in settings
    if (permStatus === 'default') {
      console.log('[PushNotifications] Permission prompt available, but not requesting automatically');
      // Don't request permission automatically - user can enable in settings
      return;
    }

    if (permStatus !== 'granted') {
      console.warn('[PushNotifications] Permission not granted:', permStatus);
      return;
    }

    // Register service worker for push notifications
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        console.log('[PushNotifications] Service worker ready');
        // Push notifications would be handled here if service worker is configured
      }
    } catch (error) {
      console.error('[PushNotifications] Error registering:', error);
      return;
    }

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[PushNotifications] No user logged in, skipping token registration');
      return;
    }

    const platform = 'web';
    const deviceId = await getDeviceId();

    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('token', token)
      .maybeSingle();

    if (existingToken) {
      // Update last_used_at
      await supabase
        .from('push_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', existingToken.id);
    } else {
      // Insert new token
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          user_id: user.id,
          token,
          platform,
          device_id: deviceId,
        });

      if (error) {
        console.error('[PushNotifications] Error registering token:', error);
        throw error;
      }
    }

    console.log('[PushNotifications] Token registered successfully');
  } catch (error) {
    console.error('[PushNotifications] Error registering push token:', error);
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
    deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
};

export const requestPermission = async (): Promise<boolean> => {
  // For web, use browser Notification API
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

