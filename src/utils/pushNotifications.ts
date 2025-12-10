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

  if (isInitialized) {
    console.log('[PushNotifications] Already initialized');
    return;
  }

  try {
    // Check if PushNotifications plugin is available
    if (!PushNotifications) {
      console.warn('[PushNotifications] Plugin not available');
      return;
    }

    // Check current permission status (don't request yet)
    let permStatus;
    try {
      permStatus = await PushNotifications.checkPermissions();
    } catch (error) {
      console.error('[PushNotifications] Error checking permissions:', error);
      return;
    }
    
    // Only request permission if not already granted/denied
    // Don't auto-request on app start - let user enable it manually in settings
    if (permStatus.receive === 'prompt') {
      console.log('[PushNotifications] Permission prompt available, but not requesting automatically');
      // Don't request permission automatically - user can enable in settings
      return;
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[PushNotifications] Permission not granted:', permStatus.receive);
      return;
    }

    // Register for push notifications only if permission is granted
    try {
      await PushNotifications.register();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[PushNotifications] No user logged in, skipping token registration');
      return;
    }

    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
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

