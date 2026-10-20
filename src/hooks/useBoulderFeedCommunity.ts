import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useBoulderComments, useBoulderCommunity, useBoulderTrackingSessions, useDeleteBoulderTick, useUpdateBoulderMarkers, useUpsertBoulderRating, useUpsertBoulderTick, useUpsertBoulderTrackingSession } from './useBoulderCommunity';
import type { BoulderTickStatus } from '@/types/community';

/** Shares the detail page's queries and write paths; no feed-only personal records. */
export function useBoulderFeedCommunity(id?: string) {
  const community = useBoulderCommunity(id);
  const comments = useBoulderComments(id);
  const sessions = useBoulderTrackingSessions(id);
  const rating = useUpsertBoulderRating(id ?? '');
  const tick = useUpsertBoulderTick(id ?? '');
  const marker = useUpdateBoulderMarkers();
  const removeTick = useDeleteBoulderTick(id ?? '');
  const session = useUpsertBoulderTrackingSession(id ?? '');
  const [saving, setSaving] = useState(false);
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const today = sessions.data?.find(row => row.session_date === todayDate);
  const current = community.data?.myTick;
  const ready = community.isSuccess && !community.isError;
  const trackReady = ready && sessions.isSuccess && !sessions.isError;
  const busy = saving || rating.isPending || marker.isPending || tick.isPending || removeTick.isPending || session.isPending || comments.addComment.isPending;
  const toggleProject = async () => {
    if (!id || !ready || !trackReady || busy) return;
    setSaving(true);
    try {
      if (current) {
        const markerOnly = current.status === 'attempted' && current.attempt_count === null && !current.note;
        if (current.is_project && !current.is_favorite && markerOnly && !sessions.data?.length) await removeTick.mutateAsync();
        else await marker.mutateAsync({ tickId: current.id, field: 'is_project', value: !current.is_project });
      } else await tick.mutateAsync({ status: 'attempted', attemptCount: null, isProject: true, isFavorite: false });
      await community.refetch({ throwOnError: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Projekt konnte nicht gespeichert werden.'); }
    finally { setSaving(false); }
  };
  const saveTrack = async (payload: { result: BoulderTickStatus; attempts: number; note: string }) => {
    if (!id || !trackReady || busy) throw new Error('Bitte warte, bis deine bisherigen Einträge geladen sind.');
    if (!Number.isInteger(payload.attempts) || payload.attempts < 1 || (payload.result === 'flash' && payload.attempts !== 1)) throw new Error('Ein Flash ist nur im ersten Versuch möglich.');
    setSaving(true);
    try {
      await session.mutateAsync({ sessionDate: todayDate, result: payload.result, attemptCount: payload.attempts, note: payload.note });
      await tick.mutateAsync({ status: payload.result, attemptCount: payload.attempts, note: payload.note, isFavorite: current?.is_favorite ?? false, isProject: current?.is_project ?? false });
      await Promise.all([community.refetch({ throwOnError: true }), sessions.refetch({ throwOnError: true })]);
      toast.success(payload.result === 'flash' ? 'Flash gespeichert' : payload.result === 'top' ? 'Top gespeichert' : 'Versuch gespeichert');
    } catch (error) {
      // A session write may have succeeded before the tick failed. Re-read that
      // partial state and let retry update the same day, rather than add a duplicate.
      await Promise.allSettled([community.refetch(), sessions.refetch()]);
      throw error;
    } finally { setSaving(false); }
  };
  const saveRating = async (value: number) => {
    if (!id || !ready || busy || !Number.isInteger(value) || value < 1 || value > 5) return;
    await rating.mutateAsync(value);
    await community.refetch({ throwOnError: true });
  };
  return { community, comments, sessions, today, current, ready, trackReady, busy, toggleProject, saveTrack, saveRating };
}
