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
      // First, verify that the participant has a gender
      const { data: participant, error: participantError } = await (supabase as any)
        .from('competition_participants')
        .select('gender')
        .eq('id', payload.participant_id)
        .single();

      if (participantError) {
        throw new Error('Teilnehmer nicht gefunden');
      }

      if (!participant || !participant.gender) {
        throw new Error('Teilnehmer hat kein Geschlecht/Klasse angegeben. Bitte aktualisiere dein Profil.');
      }

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

      if (error) throw error;
      return data as CompetitionResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['competition_results', variables.participant_id],
      });
      queryClient.invalidateQueries({ queryKey: ['competition_leaderboard'] });
      toast.success('Ergebnis gespeichert');
    },
    onError: (error) => {
      toast.error('Fehler beim Speichern: ' + error.message);
    },
  });
};

