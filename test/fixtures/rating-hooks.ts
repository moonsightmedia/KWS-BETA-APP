import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
export * from './continuity-hooks';

// In-memory rating writes only. The tests block every remote request.
let rating = 3;
const listeners = new Set<() => void>();
export function useBoulderCommunity() {
  const myRating = useSyncExternalStore(callback => {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  }, () => rating);
  return { data: { myRating, averageRating: myRating, ratingCount: 1, attributes: [], gradeFeedbackCounts: {} } };
}
export function useUpsertBoulderRating() {
  const [isPending, setPending] = useState(false);
  return { isPending, mutate: async (value: number) => {
    setPending(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    if (new URLSearchParams(location.search).has('writeError')) {
      toast.error('Bewertung nicht gespeichert');
    } else {
      rating = value;
      listeners.forEach(listener => listener());
    }
    setPending(false);
  } };
}
export const useBoulderComments = () => ({ data: [], isLoading: false, isError: false, addComment: { isPending: false } });
export const useBoulderTrackingSessions = () => ({ data: [] });
const unusedMutation = () => ({ mutate: () => {}, mutateAsync: async () => {}, isPending: false });
export const useDeleteBoulderTick = unusedMutation;
export const useUpsertBoulderGradeFeedback = unusedMutation;
export const useUpsertBoulderTrackingSession = unusedMutation;
export const useUpsertBoulderTick = unusedMutation;
