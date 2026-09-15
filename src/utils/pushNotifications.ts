import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { getCurrentSession } from '@/lib/authenticatedFetch';
import { notificationRequest } from '@/lib/notificationRequest';
import { notificationDestination } from '@/lib/notifications';

export type SessionForPush = { access_token: string; user: { id: string } };
let listenerHandles: PluginListenerHandle[] = [];
let activeSession: SessionForPush | null = null;
let registeredOwner: string | null = null;
let flight: Promise<boolean> | null = null;
let generation = 0;
let cancelRegistration: (() => void) | null = null;
const removeListeners = async () => {
  const handles = listenerHandles; listenerHandles = [];
  await Promise.all(handles.map(handle => handle.remove().catch(() => undefined)));
};
export const resetPushInitializationState = () => {
  generation++; registeredOwner = null; activeSession = null;
  cancelRegistration?.(); cancelRegistration = null; flight = null;
};
export async function stopPushListeners() {
  resetPushInitializationState();
  await removeListeners();
}
export async function unregisterPushOnDevice() {
  await stopPushListeners();
  if (Capacitor.isNativePlatform()) await PushNotifications.unregister();
}
export function getPushDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) { id = Capacitor.getPlatform() + '_' + crypto.randomUUID(); localStorage.setItem('device_id', id); }
  return id;
}
export async function registerPushToken(token: string, sessionOverride?: SessionForPush) {
  const session = sessionOverride ?? await getCurrentSession();
  if (!session || !token) throw new Error('Gerät konnte nicht zugeordnet werden.');
  const { data } = await notificationRequest('/rest/v1/push_tokens?on_conflict=token', session.access_token, {
    method: 'POST', headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: session.user.id, token, platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android', device_id: getPushDeviceId(), last_used_at: new Date().toISOString() }),
  });
  if (!Array.isArray(data) || data.length !== 1 || data[0].user_id !== session.user.id || data[0].token !== token) throw new Error('Geräteregistrierung nicht bestätigt.');
}

/** Resolves true only after the native registration event AND confirmed persistence. */
export async function initializePushNotifications(sessionOverride?: SessionForPush, force = false): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const session = sessionOverride ?? await getCurrentSession();
  if (!session) throw new Error('Bitte melde dich erneut an.');
  if (activeSession && activeSession.user.id !== session.user.id) await stopPushListeners();
  activeSession = session;
  if (flight) return flight;
  if (!force && registeredOwner === session.user.id) return true;
  const currentGeneration = generation;
  const run = async () => {
    if ((await PushNotifications.checkPermissions()).receive !== 'granted') return false;
    if (currentGeneration !== generation || activeSession?.user.id !== session.user.id) throw new Error('Registrierung abgebrochen.');
    await removeListeners();
    if (currentGeneration !== generation || activeSession?.user.id !== session.user.id) throw new Error('Registrierung abgebrochen.');
    return new Promise<boolean>((resolve, reject) => {
      let settled = false; let failed = false;
      const finish = (error?: Error) => {
        if (settled) return; settled = true; clearTimeout(timer); cancelRegistration = null;
        if (error) { failed = true; registeredOwner = null; reject(error); }
        else { registeredOwner = session.user.id; resolve(true); }
      };
      const timer = setTimeout(() => finish(new Error('Geräteregistrierung dauert zu lange. Bitte erneut versuchen.')), 15000);
      cancelRegistration = () => finish(new Error('Registrierung abgebrochen.'));
      void (async () => {
        const add = async (handle: PluginListenerHandle) => {
          if (currentGeneration !== generation || settled) { await handle.remove(); return; }
          listenerHandles.push(handle);
        };
        await add(await PushNotifications.addListener('registration', token => {
          if (failed || currentGeneration !== generation || !activeSession || activeSession.user.id !== session.user.id) return;
          void registerPushToken(token.value, activeSession).then(() => finish(), () => finish(new Error('Gerät konnte nicht gespeichert werden. Bitte erneut verbinden.')));
        }));
        await add(await PushNotifications.addListener('registrationError', () => finish(new Error('Das Gerät konnte nicht für Push registriert werden.'))));
        await add(await PushNotifications.addListener('pushNotificationReceived', () => {
          if (failed || currentGeneration !== generation) return;
          // Realtime renders the in-app toast. Native receipt only refreshes the inbox.
          window.dispatchEvent(new Event('kws:notification-received'));
        }));
        await add(await PushNotifications.addListener('pushNotificationActionPerformed', action => {
          if (failed || currentGeneration !== generation) return;
          const target = notificationDestination(action.notification.data?.action_url);
          const id = action.notification.data?.notification_id;
          window.dispatchEvent(new CustomEvent('kws:notification-open', { detail: { target, id: typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id) ? id : undefined } }));
        }));
        if (currentGeneration !== generation || settled) return;
        await PushNotifications.register();
      })().catch(() => finish(new Error('Push-Verbindung fehlgeschlagen. Bitte erneut versuchen.')));
    });
  };
  const currentFlight = run().finally(() => { if (flight === currentFlight) flight = null; });
  flight = currentFlight;
  return currentFlight;
}
export async function deletePushTokensForUser(userId: string, accessToken: string) {
  await notificationRequest('/rest/v1/push_tokens?user_id=eq.' + encodeURIComponent(userId), accessToken, { method: 'DELETE' });
}
export async function unregisterPushToken(token: string) {
  const session = await getCurrentSession();
  if (!session) return;
  const q = new URLSearchParams({ token: 'eq.' + token, user_id: 'eq.' + session.user.id });
  await notificationRequest('/rest/v1/push_tokens?' + q, session.access_token, { method: 'DELETE' });
}
export async function requestTokenAndRegister() {
  if (!await initializePushNotifications(undefined, true)) throw new Error('Push-Berechtigung fehlt.');
}
export async function requestPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  return (await PushNotifications.requestPermissions()).receive === 'granted';
}
export async function getPushPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const value = (await PushNotifications.checkPermissions()).receive;
  return value === 'granted' || value === 'denied' ? value : 'prompt';
}
