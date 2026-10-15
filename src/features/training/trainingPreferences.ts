import { useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface TrainingPreferences {
  trainingEnabled: boolean;
  kidsEnabled: boolean;
}
type Snapshot = TrainingPreferences & { storageStatus: 'saved' | 'unavailable' };
const DEFAULTS: TrainingPreferences = { trainingEnabled: true, kidsEnabled: true };
const SERVER_SNAPSHOT: Snapshot = { ...DEFAULTS, storageStatus: 'unavailable' };
const snapshots = new Map<string, Snapshot>();
const listeners = new Set<() => void>();
const PREFIX = 'kws-training-preferences-v1:';
export const trainingPreferenceStorageKey = (accountId: string) => `${PREFIX}${accountId}`;

function readSnapshot(accountId: string, previous?: Snapshot): Snapshot {
  const unavailable = (): Snapshot => ({ trainingEnabled: previous?.trainingEnabled ?? true, kidsEnabled: previous?.kidsEnabled ?? true, storageStatus: 'unavailable' });
  try {
    const raw = localStorage.getItem(trainingPreferenceStorageKey(accountId));
    if (!raw) return { ...DEFAULTS, storageStatus: 'saved' };
    if (raw.length > 4096) return unavailable();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return unavailable();
    const record = value as Record<string, unknown>;
    if (record.version !== 1 || typeof record.trainingEnabled !== 'boolean' || typeof record.kidsEnabled !== 'boolean') return unavailable();
    return { trainingEnabled: record.trainingEnabled, kidsEnabled: record.kidsEnabled, storageStatus: 'saved' };
  } catch { return unavailable(); }
}
function snapshotFor(accountId?: string) {
  if (!accountId || typeof window === 'undefined') return SERVER_SNAPSHOT;
  if (!snapshots.has(accountId)) snapshots.set(accountId, readSnapshot(accountId));
  return snapshots.get(accountId)!;
}
const emit = () => listeners.forEach(listener => listener());
function onStorage(event: StorageEvent) {
  if (event.key !== null && !event.key.startsWith(PREFIX)) return;
  for (const accountId of snapshots.keys()) {
    if (event.key === null || event.key === trainingPreferenceStorageKey(accountId)) snapshots.set(accountId, readSnapshot(accountId, snapshots.get(accountId)));
  }
  emit();
}
function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    // Catch changes made in another tab while no consumer was mounted.
    for (const [accountId, previous] of snapshots) if (previous.storageStatus === 'saved') snapshots.set(accountId, readSnapshot(accountId, previous));
    window.addEventListener('storage', onStorage);
  }
  listeners.add(listener);
  return () => { listeners.delete(listener); if (listeners.size === 0) window.removeEventListener('storage', onStorage); };
}
function update(accountId: string | undefined, field: keyof TrainingPreferences, enabled: boolean): boolean {
  if (!accountId) return false;
  const previous = snapshotFor(accountId);
  const preferences = { trainingEnabled: previous.trainingEnabled, kidsEnabled: previous.kidsEnabled, [field]: enabled };
  let saved = false;
  try { localStorage.setItem(trainingPreferenceStorageKey(accountId), JSON.stringify({ version: 1, ...preferences })); saved = true; } catch { /* Session choice remains usable when persistence fails. */ }
  snapshots.set(accountId, { ...preferences, storageStatus: saved ? 'saved' : 'unavailable' });
  emit();
  return saved;
}

/** Account-scoped local display choices; independent of training data and feature release. */
export function useTrainingPreferences() {
  const { user } = useAuth();
  const accountId = user?.id;
  const getSnapshot = useCallback(() => snapshotFor(accountId), [accountId]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const setTrainingEnabled = useCallback((enabled: boolean) => update(accountId, 'trainingEnabled', enabled), [accountId]);
  const setKidsEnabled = useCallback((enabled: boolean) => update(accountId, 'kidsEnabled', enabled), [accountId]);
  return { ...state, setTrainingEnabled, setKidsEnabled };
}
