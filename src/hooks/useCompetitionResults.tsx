import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompetitionResult {
  id: string;
  participant_id: string;
  boulder_number: number;
  result_type: 'flash' | 'top' | 'zone' | 'none';
  attempts: number | null;
  points: number;
  created_at: string;
  updated_at: string;
}

export const useCompetitionResults = (participantId: string | null) => {
  return useQuery({
    queryKey: ['competition_results', participantId],
    queryFn: async () => {
      if (!participantId) return [];

      const { data, error } = await (supabase as any)
        .from('competition_results')
        .select('*')
        .eq('participant_id', participantId)
        .order('boulder_number', { ascending: true });

      if (error) throw error;
      return data as CompetitionResult[];
    },
    enabled: !!participantId,
  });
};

export const useSubmitCompetitionResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      participant_id: string;
      boulder_number: number;
      result_type: 'flash' | 'top' | 'zone' | 'none';
      attempts?: number | null;
    }) => {
      console.log('[useCompetitionResults] Starting mutation with payload:', payload);
      
      // First, verify that the participant has a gender
      console.log('[useCompetitionResults] Verifying participant:', payload.participant_id);
      const { data: participant, error: participantError } = await (supabase as any)
        .from('competition_participants')
        .select('gender')
        .eq('id', payload.participant_id)
        .single();

      if (participantError) {
        console.error('[useCompetitionResults] Participant not found:', participantError);
        throw new Error('Teilnehmer nicht gefunden');
      }

      if (!participant || !participant.gender) {
        console.error('[useCompetitionResults] Participant has no gender:', participant);
        throw new Error('Teilnehmer hat kein Geschlecht/Klasse angegeben. Bitte aktualisiere dein Profil.');
      }

      console.log('[useCompetitionResults] Participant verified, gender:', participant.gender);
      console.log('[useCompetitionResults] Upserting result...');

      // Use upsert to handle both insert and update
      const { data, error } = await (supabase as any)
        .from('competition_results')
        .upsert(
          {
            participant_id: payload.participant_id,
            boulder_number: payload.boulder_number,
            result_type: payload.result_type,
            attempts: payload.attempts || null,
          },
          {
            onConflict: 'participant_id,boulder_number',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[useCompetitionResults] Upsert error:', error);
        throw error;
      }
      
      console.log('[useCompetitionResults] Upsert successful, data:', data);
      return data as CompetitionResult;
    },
    onMutate: async (variables) => {
      console.log('[useCompetitionResults] Optimistic update for boulder', variables.boulder_number);
      
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['competition_results', variables.participant_id] });
      await queryClient.cancelQueries({ queryKey: ['competition_leaderboard'] });
      
      // Snapshot previous values
      const previousResults = queryClient.getQueryData<CompetitionResult[]>(['competition_results', variables.participant_id]);
      const previousLeaderboard = queryClient.getQueryData(['competition_leaderboard']);
      
      // Optimistically update results
      if (previousResults) {
        const updatedResults = [...previousResults];
        const existingIndex = updatedResults.findIndex(r => r.boulder_number === variables.boulder_number);
        
        const optimisticResult: CompetitionResult = {
          id: existingIndex >= 0 ? updatedResults[existingIndex].id : 'temp-' + Date.now(),
          participant_id: variables.participant_id,
          boulder_number: variables.boulder_number,
          result_type: variables.result_type,
          attempts: variables.attempts || null,
          points: 0, // Will be calculated by database trigger
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        if (existingIndex >= 0) {
          updatedResults[existingIndex] = optimisticResult;
        } else {
          updatedResults.push(optimisticResult);
        }
        
        queryClient.setQueryData(['competition_results', variables.participant_id], updatedResults);
      }
      
      return { previousResults, previousLeaderboard };
    },
    onError: (error, variables, context) => {
      console.error('[useCompetitionResults] Error saving result:', error);
      
      // Rollback optimistic update
      if (context?.previousResults) {
        queryClient.setQueryData(['competition_results', variables.participant_id], context.previousResults);
      }
      if (context?.previousLeaderboard) {
        queryClient.setQueryData(['competition_leaderboard'], context.previousLeaderboard);
      }
      
      toast.error('Fehler beim Speichern: ' + error.message);
    },
    onSuccess: async (data, variables) => {
      console.log('[useCompetitionResults] ✅ Result saved successfully:', data);
      console.log('[useCompetitionResults] Refetching to get correct points...');
      
      // Invalidate and refetch to get correct points from database
      queryClient.invalidateQueries({
        queryKey: ['competition_results', variables.participant_id],
      });
      queryClient.invalidateQueries({ queryKey: ['competition_leaderboard'] });
      
      // Refetch immediately to update with correct points
      try {
        const [resultsRefetch, leaderboardRefetch] = await Promise.allSettled([
          queryClient.refetchQueries({
            queryKey: ['competition_results', variables.participant_id],
          }),
          queryClient.refetchQueries({ 
            queryKey: ['competition_leaderboard'],
          }),
        ]);
        
        const resultsCount = resultsRefetch.status === 'fulfilled' && Array.isArray(resultsRefetch.value) 
          ? resultsRefetch.value.length 
          : 0;
        const leaderboardCount = leaderboardRefetch.status === 'fulfilled' && Array.isArray(leaderboardRefetch.value)
          ? leaderboardRefetch.value.length
          : 0;
        
        console.log('[useCompetitionResults] ✅ Queries refetched successfully:', {
          results: resultsCount,
          leaderboard: leaderboardCount,
        });
        
        if (resultsRefetch.status === 'rejected') {
          console.warn('[useCompetitionResults] Results refetch failed:', resultsRefetch.reason);
        }
        if (leaderboardRefetch.status === 'rejected') {
          console.warn('[useCompetitionResults] Leaderboard refetch failed:', leaderboardRefetch.reason);
        }
      } catch (error) {
        console.error('[useCompetitionResults] ❌ Error refetching queries:', error);
      }
      
      toast.success('Ergebnis gespeichert');
    },
  });
};

