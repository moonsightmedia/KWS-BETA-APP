import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardEntry {
  participant_id: string;
  name: string;
  gender: 'male' | 'female' | 'other' | null;
  is_guest: boolean;
  total_points: number;
  flash_count: number;
  top_count: number;
  zone_count: number;
  none_count: number;
  results: Array<{
    boulder_number: number;
    result_type: 'flash' | 'top' | 'zone' | 'none';
    attempts: number | null;
    points: number;
  }>;
}

export const useCompetitionLeaderboard = (gender?: 'male' | 'female' | null) => {
  return useQuery({
    queryKey: ['competition_leaderboard', gender],
    queryFn: async () => {
      // Build query with optional gender filter
      // First, get all participants with their results
      let participantsQuery: any = (supabase as any)
        .from('competition_participants')
        .select('id, user_id, guest_name, gender, is_guest');

      if (gender) {
        participantsQuery = participantsQuery.eq('gender', gender);
      }
      
      // Add reasonable limit - 1000 is too high and might cause issues
      // For leaderboard, we only need participants with results anyway
      participantsQuery = participantsQuery.limit(500);

      const { data: participantsData, error: participantsError } = await participantsQuery;

      if (participantsError) {
        console.error('[useCompetitionLeaderboard] Participants query error:', participantsError);
        throw participantsError;
      }

      if (!participantsData || participantsData.length === 0) {
        return [];
      }

      // If we got too many participants, something is wrong
      if (participantsData.length >= 500) {
        if (import.meta.env.DEV) {
          console.warn('[Leaderboard] Many participants:', participantsData.length, 'This might indicate a query issue');
        }
      }

      // Get all results for these participants
      const participantIds = participantsData.map((p: any) => p.id);
      
      // If no participant IDs, return empty array
      if (participantIds.length === 0) {
        return [];
      }
      
      // Query results - use .in() if participantIds is small enough, otherwise fetch all
      let resultsData: any[] = [];
      
      if (participantIds.length <= 100) {
        // Use .in() for small sets (more efficient)
        const { data: filteredResults, error: resultsError } = await (supabase as any)
          .from('competition_results')
          .select('participant_id, boulder_number, result_type, attempts, points')
          .in('participant_id', participantIds);
        
        if (resultsError) {
          console.error('[useCompetitionLeaderboard] Results query error:', resultsError);
          throw resultsError;
        }
        
        resultsData = filteredResults || [];
      } else {
        // For large sets, fetch all and filter in memory
        const { data: allResultsData, error: resultsError } = await (supabase as any)
          .from('competition_results')
          .select('participant_id, boulder_number, result_type, attempts, points')
          .limit(10000);
        
        if (resultsError) {
          console.error('[useCompetitionLeaderboard] Results query error:', resultsError);
          throw resultsError;
        }
        
        // Filter results to only include those for our participants
        resultsData = (allResultsData || []).filter((r: any) => 
          participantIds.includes(r.participant_id)
        );
      }

      // Group results by participant_id
      const resultsByParticipant = new Map<string, any[]>();
      (resultsData || []).forEach((result: any) => {
        if (!resultsByParticipant.has(result.participant_id)) {
          resultsByParticipant.set(result.participant_id, []);
        }
        resultsByParticipant.get(result.participant_id)!.push(result);
      });

      // Combine participants with their results
      const data = participantsData.map((participant: any) => ({
        ...participant,
        competition_results: resultsByParticipant.get(participant.id) || [],
      }));

      // Fetch profiles for logged-in users separately
      const userIds = (participantsData || [])
        .filter((p: any) => p.user_id)
        .map((p: any) => p.user_id);
      
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap.set(profile.id, profile);
          });
        }
      }

      // Transform data to calculate totals
      // Only include participants who have at least one result (excluding 'none' results)
      const entries: LeaderboardEntry[] = (data || [])
        .filter((participant: any) => {
          const results = participant.competition_results || [];
          // Only show participants who have at least one result that is not 'none'
          const hasValidResult = results.some((r: any) => r.result_type !== 'none' && r.points > 0);
          // Only log in development
          if (import.meta.env.DEV && !hasValidResult && results.length > 0) {
            console.log('[Leaderboard] Filtering out participant:', participant.id, 'Results:', results.map((r: any) => ({ type: r.result_type, points: r.points })));
          }
          return hasValidResult;
        })
        .map((participant: any) => {
          const results = participant.competition_results || [];
          const totalPoints = results.reduce(
            (sum: number, r: any) => sum + (r.points || 0),
            0
          );

          const flashCount = results.filter((r: any) => r.result_type === 'flash').length;
          const topCount = results.filter((r: any) => r.result_type === 'top').length;
          const zoneCount = results.filter((r: any) => r.result_type === 'zone').length;
          const noneCount = results.filter((r: any) => r.result_type === 'none').length;

          // Get name from user profile or guest_name
          // Format: "Vorname + erster Buchstabe des Nachnamens" (e.g., "Janosch J.")
          const profile = participant.user_id ? profilesMap.get(participant.user_id) : null;
          let name = 'Unbekannt';
          
          if (participant.guest_name) {
            name = participant.guest_name;
          } else if (profile) {
            const firstName = profile.first_name || (profile.full_name ? profile.full_name.split(' ')[0] : null);
            const lastName = profile.last_name || (profile.full_name ? profile.full_name.split(' ').slice(1).join(' ') : null);
            
            if (firstName) {
              if (lastName && lastName.trim().length > 0) {
                // Vorname + erster Buchstabe des Nachnamens
                name = `${firstName} ${lastName.trim()[0].toUpperCase()}.`;
              } else {
                // Nur Vorname, wenn kein Nachname vorhanden
                name = firstName;
              }
            } else {
              name = 'Unbekannt';
            }
          }

          return {
            participant_id: participant.id,
            name,
            gender: participant.gender,
            is_guest: participant.is_guest,
            total_points: totalPoints,
            flash_count: flashCount,
            top_count: topCount,
            zone_count: zoneCount,
            none_count: noneCount,
            results: results.map((r: any) => ({
              boulder_number: r.boulder_number,
              result_type: r.result_type,
              attempts: r.attempts,
              points: r.points,
            })),
          };
        });

      // Sort by total points descending
      entries.sort((a, b) => b.total_points - a.total_points);

      // Only log in development to reduce console noise
      if (import.meta.env.DEV) {
        console.log('[Leaderboard] Final entries:', entries.length, 'Participants with data:', participantsData.length, 'Results found:', resultsData.length, 'Gender filter:', gender || 'none');
        
        // Debug: Show sample entries
        if (entries.length > 0) {
          console.log('[Leaderboard] Sample entry:', entries[0]);
        } else if (participantsData.length > 0 && participantsData.length < 20) {
          // Only log if reasonable number of participants
          console.log('[Leaderboard] No entries but participants exist. Sample participant:', {
            id: participantsData[0].id,
            results: participantsData[0].competition_results?.length || 0,
            sampleResult: participantsData[0].competition_results?.[0]
          });
        }
      }

      return entries;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
  });
};

