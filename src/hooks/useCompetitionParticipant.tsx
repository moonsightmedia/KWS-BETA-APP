import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CompetitionParticipant {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  gender: 'male' | 'female' | 'other' | null;
  is_guest: boolean;
  created_at: string;
}

export const useCompetitionParticipant = () => {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['competition_participant', user?.id],
    enabled: !authLoading,
    queryFn: async () => {
      if (!user) {
        // For guests, try to get participant from localStorage (guest_id)
        try {
          const guestId = localStorage.getItem('competition_guest_id');
          if (guestId) {
            const { data, error } = await (supabase as any)
              .from('competition_participants')
              .select('*')
              .eq('id', guestId)
              .eq('is_guest', true)
              .maybeSingle();
            
            if (error) throw error;
            return data as CompetitionParticipant | null;
          }
        } catch {
          // Ignore localStorage errors
        }
        return null;
      }

      const { data, error } = await (supabase as any)
        .from('competition_participants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CompetitionParticipant | null;
    },
  });
};

export const useCreateCompetitionParticipant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      gender?: 'male' | 'female' | 'other' | null;
      guest_name?: string;
    }) => {
      // First, check if participant already exists
      if (user) {
        // For logged-in users, check if participant already exists
        const { data: existingParticipant } = await (supabase as any)
          .from('competition_participants')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existingParticipant) {
          // Participant already exists, update gender if provided
          if (payload.gender !== undefined) {
            const { data: updated, error: updateError } = await (supabase as any)
              .from('competition_participants')
              .update({ gender: payload.gender })
              .eq('id', existingParticipant.id)
              .select()
              .single();
            
            if (updateError) throw updateError;
            return updated as CompetitionParticipant;
          }
          return existingParticipant as CompetitionParticipant;
        }
      } else {
        // For guests, check if participant with same name already exists
        if (payload.guest_name) {
          const { data: existingGuest } = await (supabase as any)
            .from('competition_participants')
            .select('*')
            .eq('guest_name', payload.guest_name)
            .eq('is_guest', true)
            .maybeSingle();
          
          if (existingGuest) {
            // Guest participant already exists, update gender if provided
            if (payload.gender !== undefined) {
              const { data: updated, error: updateError } = await (supabase as any)
                .from('competition_participants')
                .update({ gender: payload.gender })
                .eq('id', existingGuest.id)
                .select()
                .single();
              
              if (updateError) throw updateError;
              
              // Store guest ID in localStorage
              if (updated.is_guest && updated.id) {
                try {
                  localStorage.setItem('competition_guest_id', updated.id);
                } catch {
                  // Ignore localStorage errors
                }
              }
              
              return updated as CompetitionParticipant;
            }
            
            // Store guest ID in localStorage
            if (existingGuest.is_guest && existingGuest.id) {
              try {
                localStorage.setItem('competition_guest_id', existingGuest.id);
              } catch {
                // Ignore localStorage errors
              }
            }
            
            return existingGuest as CompetitionParticipant;
          }
        }
      }

      // No existing participant found, create new one
      // Gender is required - throw error if not provided
      if (!payload.gender) {
        throw new Error('Geschlecht/Klasse ist verpflichtend für die Teilnahme am Wettkampf');
      }

      const insertData: any = {
        gender: payload.gender,
      };

      if (user) {
        insertData.user_id = user.id;
        insertData.is_guest = false;
      } else {
        insertData.guest_name = payload.guest_name;
        insertData.is_guest = true;
      }

      const { data, error } = await (supabase as any)
        .from('competition_participants')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      // Store guest ID in localStorage for guests
      if (data.is_guest && data.id) {
        try {
          localStorage.setItem('competition_guest_id', data.id);
        } catch {
          // Ignore localStorage errors
        }
      }
      
      return data as CompetitionParticipant;
    },
    onSuccess: (data) => {
      // Invalidate all participant queries to ensure refetch
      queryClient.invalidateQueries({ queryKey: ['competition_participant'] });
      queryClient.invalidateQueries({ queryKey: ['competition_leaderboard'] });
      // Also set the data directly to avoid waiting for refetch
      if (user) {
        queryClient.setQueryData(['competition_participant', user.id], data);
      }
      
      // Store guest ID in localStorage for guests
      if (data.is_guest && data.id) {
        try {
          localStorage.setItem('competition_guest_id', data.id);
        } catch {
          // Ignore localStorage errors
        }
      }
    },
  });
};

export const useUpdateCompetitionParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CompetitionParticipant>;
    }) => {
      // Prevent setting gender to null
      if (updates.gender === null || updates.gender === undefined) {
        // If gender is being removed, check if participant has results
        const { data: participant } = await (supabase as any)
          .from('competition_participants')
          .select('id')
          .eq('id', id)
          .single();

        if (participant) {
          const { data: results } = await (supabase as any)
            .from('competition_results')
            .select('id')
            .eq('participant_id', id)
            .limit(1);

          if (results && results.length > 0) {
            throw new Error('Geschlecht kann nicht entfernt werden, da bereits Ergebnisse vorhanden sind.');
          }
        }
        // Remove gender from updates if it's null/undefined
        const { gender, ...restUpdates } = updates;
        updates = restUpdates;
      }

      const { data, error } = await (supabase as any)
        .from('competition_participants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition_participant'] });
      queryClient.invalidateQueries({ queryKey: ['competition_leaderboard'] });
    },
  });
};

export const useDeleteCompetitionParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: string) => {
      console.log('[useDeleteCompetitionParticipant] Deleting participant:', participantId);
      
      // First, delete all results for this participant
      const { error: resultsError, data: resultsData } = await (supabase as any)
        .from('competition_results')
        .delete()
        .eq('participant_id', participantId)
        .select();

      if (resultsError) {
        console.error('[useDeleteCompetitionParticipant] Error deleting results:', resultsError);
        throw new Error('Fehler beim Löschen der Ergebnisse: ' + resultsError.message);
      }

      console.log('[useDeleteCompetitionParticipant] Deleted results:', resultsData?.length || 0);

      // Then, delete the participant
      const { error, data: participantData } = await (supabase as any)
        .from('competition_participants')
        .delete()
        .eq('id', participantId)
        .select();

      if (error) {
        console.error('[useDeleteCompetitionParticipant] Error deleting participant:', error);
        throw new Error('Fehler beim Löschen des Teilnehmers: ' + error.message);
      }

      console.log('[useDeleteCompetitionParticipant] Deleted participant:', participantData);
    },
    onSuccess: async (_, participantId) => {
      console.log('[useDeleteCompetitionParticipant] Success, invalidating queries...');
      
      // Invalidate all related queries - use prefix matching to catch all variations
      await queryClient.invalidateQueries({ queryKey: ['competition_participant'] });
      await queryClient.invalidateQueries({ queryKey: ['competition_participants'] });
      await queryClient.invalidateQueries({ queryKey: ['competition_leaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['competition_results'] });
      
      // Also invalidate queries with specific participant_id
      await queryClient.invalidateQueries({ 
        queryKey: ['competition_results', participantId] 
      });
      
      // Explicitly refetch all leaderboard queries to ensure immediate update
      await queryClient.refetchQueries({ queryKey: ['competition_leaderboard'] });
      
      // Refetch competition_results queries to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['competition_results'] });
      
      console.log('[useDeleteCompetitionParticipant] Queries invalidated and refetched');
    },
    onError: (error) => {
      console.error('[useDeleteCompetitionParticipant] Mutation error:', error);
    },
  });
};

