import { supabase } from '@/integrations/supabase/client';

const devLog = (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args); };
const devError = (...args: unknown[]) => { if (import.meta.env.DEV) console.error(...args); };

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
}

export interface PushDeliveryResult {
  platform: 'android' | 'ios' | 'web';
  token?: string;
  success: boolean;
  invalid?: boolean;
  error?: string;
  result?: unknown;
}

export interface PushDeliveryResponse {
  success: boolean;
  notification_id?: string;
  sent?: number;
  failed?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
  results?: PushDeliveryResult[];
}

type SessionLike = {
  access_token?: string;
  user?: { id?: string };
};

async function getSession(sessionOverride?: SessionLike): Promise<SessionLike | null> {
  if (sessionOverride?.access_token) return sessionOverride;

  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Session timeout after 5s')), 5000),
  );

  try {
    const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: SessionLike | null } };
    return result?.data?.session ?? null;
  } catch (error) {
    devWarn('[PushNotifications] Session fetch timed out or failed:', error);
    return null;
  }
}

export async function sendPushNotificationForNotification(
  notificationId: string,
  sessionOverride?: SessionLike,
): Promise<PushDeliveryResponse | null> {
  devLog('[PushNotifications] Sending push for notification:', notificationId);

  const session = await getSession(sessionOverride);
  if (!session?.access_token) {
    devWarn('[PushNotifications] No active session, skipping push delivery');
    return null;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase-Konfiguration fehlt');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notification_id: notificationId }),
  });

  const responseText = await response.text();
  let data: PushDeliveryResponse;
  try {
    data = responseText ? JSON.parse(responseText) : { success: response.ok };
  } catch {
    data = { success: false, error: responseText };
  }

  if (!response.ok || data.success === false) {
    const message = data.error || responseText || `HTTP ${response.status}`;
    devError('[PushNotifications] Edge Function delivery failed:', message, data);
    throw new Error(message);
  }

  devLog('[PushNotifications] Edge Function delivery result:', data);
  return data;
}

export async function sendNewBoulderNotifications(
  boulderIds: string[],
  sessionOverride?: SessionLike,
): Promise<PushDeliveryResponse | null> {
  const session = await getSession(sessionOverride);
  if (!session?.access_token) {
    devWarn('[PushNotifications] No active session, skipping new boulder notifications');
    return null;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase-Konfiguration fehlt');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'boulder_new', boulder_ids: boulderIds }),
  });

  const responseText = await response.text();
  let data: PushDeliveryResponse;
  try {
    data = responseText ? JSON.parse(responseText) : { success: response.ok };
  } catch {
    data = { success: false, error: responseText };
  }

  if (!response.ok || data.success === false) {
    const message = data.error || responseText || `HTTP ${response.status}`;
    devError('[PushNotifications] New boulder notification delivery failed:', message, data);
    throw new Error(message);
  }

  devLog('[PushNotifications] New boulder notification delivery result:', data);
  return data;
}

/**
 * Admin/test helper: create an in-app notification first, then deliver push through
 * the same server-side notification_id flow used by real app events.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload,
  sessionOverride?: SessionLike,
): Promise<PushDeliveryResponse | null> {
  const session = await getSession(sessionOverride);
  if (!session?.access_token) {
    throw new Error('No active session found');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase-Konfiguration fehlt');
  }

  const createResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      type: 'admin_announcement',
      title: payload.title,
      message: payload.body,
      data: payload.data || {},
      action_url: payload.action_url || '/',
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Notification create failed: ${createResponse.status} ${await createResponse.text()}`);
  }

  const created = await createResponse.json();
  const notification = Array.isArray(created) ? created[0] : created;
  if (!notification?.id) {
    throw new Error('Notification create failed: no notification id returned');
  }

  return sendPushNotificationForNotification(notification.id, session);
}
