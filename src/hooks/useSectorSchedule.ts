import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SectorSchedule {
  id: string;
  sector_id: string;
  scheduled_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export const useSectorSchedule = () => {
  const { user, session, loading: authLoading } = useAuth();
  const queriesEnabled = !authLoading && !!user && !!session;

  return useQuery({
    queryKey: ['sector_schedule'],
    enabled: queriesEnabled,
    queryFn: async () => {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase URL or API key not found');
      }

      // Get the access token from the session for RLS
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const queryUrl = `${SUPABASE_URL}/rest/v1/sector_schedule?select=*&order=scheduled_at.asc`;
      
      const response = await window.fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load schedule: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data as SectorSchedule[];
    },
    staleTime: 0, // Always refetch
  });
};

export const useCreateSectorSchedule = () => {
  const qc = useQueryClient();
  const { session } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: Omit<SectorSchedule, 'id' | 'created_at' | 'created_by'>) => {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase URL or API key not found');
      }

      // Get the access token from the session for RLS
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('No access token available. Bitte melde dich an.');
      }

      const insertUrl = `${SUPABASE_URL}/rest/v1/sector_schedule`;
      
      const response = await window.fetch(insertUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useCreateSectorSchedule] Error:', response.status, errorText);
        throw new Error(`Failed to create schedule: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      // Return single item if array, otherwise return the data
      return (Array.isArray(data) && data.length > 0 ? data[0] : data) as SectorSchedule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sector_schedule'] });
      qc.refetchQueries({ queryKey: ['sector_schedule'] });
    },
    onError: (error) => {
      console.error('[useCreateSectorSchedule] Mutation error:', error);
    }
  });
};

export const useDeleteSectorSchedule = () => {
  const qc = useQueryClient();
  const { session } = useAuth();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase URL or API key not found');
      }

      // Get the access token from the session for RLS
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const deleteUrl = `${SUPABASE_URL}/rest/v1/sector_schedule?id=eq.${id}`;
      
      const response = await window.fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete schedule: ${response.status} ${errorText}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sector_schedule'] });
    }
  });
};

export interface SectorScheduleGroupInput {
  sectorIds: string[];
  scheduledAt: string;
  note: string | null;
}

export const useCreateSectorScheduleGroup = () => {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ sectorIds, scheduledAt, note }: SectorScheduleGroupInput) => {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token;

      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase URL or API key not found');
      }
      if (!accessToken) {
        throw new Error('No access token available. Bitte melde dich an.');
      }

      const uniqueSectorIds = [...new Set(sectorIds)].filter(Boolean);
      if (uniqueSectorIds.length === 0) {
        throw new Error('Mindestens ein Teilbereich muss ausgewählt sein.');
      }

      // PostgREST executes a bulk insert as one database statement, so a
      // logical subarea that spans multiple physical rows stays atomic.
      const response = await window.fetch(`${SUPABASE_URL}/rest/v1/sector_schedule`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(uniqueSectorIds.map((sectorId) => ({
          sector_id: sectorId,
          scheduled_at: scheduledAt,
          note,
        }))),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create schedule group: ${response.status} ${errorText}`);
      }

      const rows = await response.json() as SectorSchedule[];
      if (rows.length !== uniqueSectorIds.length) {
        throw new Error('Der Terminblock wurde nicht vollständig erstellt.');
      }
      return rows;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sector_schedule'] });
    },
    onError: (error) => {
      console.error('[useCreateSectorScheduleGroup] Mutation error:', error);
    },
  });
};

export const useDeleteSectorScheduleGroup = () => {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (scheduleIds: string[]) => {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token;

      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase URL or API key not found');
      }
      if (!accessToken) {
        throw new Error('No access token available. Bitte melde dich an.');
      }

      const uniqueScheduleIds = [...new Set(scheduleIds)].filter(Boolean);
      if (uniqueScheduleIds.length === 0) {
        throw new Error('Mindestens ein Termin muss ausgewählt sein.');
      }

      // One filtered DELETE statement keeps a multi-row logical subarea atomic.
      const idFilter = uniqueScheduleIds.join(',');
      const response = await window.fetch(`${SUPABASE_URL}/rest/v1/sector_schedule?id=in.(${idFilter})`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete schedule group: ${response.status} ${errorText}`);
      }

      const rows = await response.json() as SectorSchedule[];
      if (rows.length !== uniqueScheduleIds.length) {
        throw new Error('Der Terminblock wurde nicht vollständig gelöscht.');
      }
      return rows;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sector_schedule'] });
    },
  });
};


