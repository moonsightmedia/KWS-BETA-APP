import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { supabaseRestRequest } from '@/lib/supabaseRest';
import type {
  BoulderAttributeOption,
  BoulderComment,
  BoulderCommunitySummary,
  BoulderGradeFeedback,
  BoulderTick,
  BoulderTrackingSession,
  BoulderTickStatus,
  BoulderTickSummary,
} from '@/types/community';

interface RatingRow {
  user_id: string;
  rating: number;
}

interface BoulderRatingSummaryRow extends RatingRow {
  boulder_id: string;
}

interface GradeFeedbackRow {
  user_id: string;
  feedback: BoulderGradeFeedback;
}

interface AttributeAssignmentRow {
  attribute_id: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface BoulderListItem {
  id: string;
  name: string;
  color: string;
  difficulty: number | null;
  created_at: string;
}

interface TrackedBoulderItem {
  boulder: BoulderListItem | null;
  tick: BoulderTick;
}

const emptyTickSummary: BoulderTickSummary = {
  flash_count: 0,
  top_count: 0,
  attempted_count: 0,
  total_ticks: 0,
};

function buildInFilter(ids: string[]) {
  return ids.join(',');
}

type BoulderRatingSummaryMap = Record<string, Pick<BoulderCommunitySummary, 'averageRating' | 'ratingCount'>>;

function isMissingDailySessionConflictTarget(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('there is no unique or exclusion constraint matching the ON CONFLICT specification')
    || error.message.includes('42P10');
}

async function fetchProfiles(accessToken: string | null | undefined, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const profiles = await supabaseRestRequest<ProfileRow[]>(
    `/rest/v1/profiles?id=in.(${buildInFilter(userIds)})&select=id,full_name,email`,
    { accessToken },
  );

  return new Map(profiles.map((profile) => [profile.id, profile]));
}

export function useBoulderRatingSummaries(boulderIds: string[]) {
  const { session, loading, user } = useAuth();

  return useQuery({
    queryKey: ['boulder-rating-summaries', boulderIds],
    enabled: !loading && !!session && !!user && boulderIds.length > 0,
    queryFn: async (): Promise<BoulderRatingSummaryMap> => {
      const ratings = await supabaseRestRequest<BoulderRatingSummaryRow[]>(
        `/rest/v1/boulder_ratings?boulder_id=in.(${buildInFilter(boulderIds)})&select=boulder_id,user_id,rating`,
        { accessToken: session?.access_token },
      );

      const summaries: BoulderRatingSummaryMap = {};

      for (const rating of ratings) {
        const currentSummary = summaries[rating.boulder_id] ?? { averageRating: 0, ratingCount: 0 };
        summaries[rating.boulder_id] = {
          averageRating: (currentSummary.averageRating ?? 0) + rating.rating,
          ratingCount: currentSummary.ratingCount + 1,
        };
      }

      for (const [boulderId, summary] of Object.entries(summaries)) {
        summaries[boulderId] = {
          averageRating: summary.ratingCount > 0
            ? Number(((summary.averageRating ?? 0) / summary.ratingCount).toFixed(1))
            : null,
          ratingCount: summary.ratingCount,
        };
      }

      return summaries;
    },
  });
}

export function useBoulderCommunity(boulderId: string | undefined) {
  const { user, session, loading } = useAuth();

  return useQuery({
    queryKey: ['boulder-community', boulderId, user?.id],
    enabled: !loading && !!session && !!user && !!boulderId,
    queryFn: async (): Promise<BoulderCommunitySummary> => {
      const accessToken = session?.access_token;

      const [attributes, ratings, gradeFeedbackRows, attributeAssignments, myTickRows, tickSummaryRows] = await Promise.all([
        supabaseRestRequest<BoulderAttributeOption[]>(
          '/rest/v1/boulder_attributes?select=id,key,label,sort_order,is_active&is_active=eq.true&order=sort_order.asc',
          { accessToken },
        ),
        supabaseRestRequest<RatingRow[]>(
          `/rest/v1/boulder_ratings?boulder_id=eq.${boulderId}&select=user_id,rating`,
          { accessToken },
        ),
        supabaseRestRequest<GradeFeedbackRow[]>(
          `/rest/v1/boulder_grade_feedback?boulder_id=eq.${boulderId}&select=user_id,feedback`,
          { accessToken },
        ),
        supabaseRestRequest<AttributeAssignmentRow[]>(
          `/rest/v1/boulder_attribute_assignments?boulder_id=eq.${boulderId}&select=attribute_id`,
          { accessToken },
        ),
        supabaseRestRequest<BoulderTick[]>(
          `/rest/v1/boulder_ticks?boulder_id=eq.${boulderId}&user_id=eq.${user?.id}&select=id,boulder_id,user_id,status,attempt_count,note,is_favorite,is_project,created_at,updated_at&limit=1`,
          { accessToken },
        ),
        supabaseRestRequest<BoulderTickSummary[]>(
          '/rest/v1/rpc/get_boulder_tick_summary',
          {
            accessToken,
            method: 'POST',
            body: { p_boulder_id: boulderId },
          },
        ),
      ]);

      const ratingCount = ratings.length;
      const averageRating = ratingCount > 0
        ? Number((ratings.reduce((sum, row) => sum + row.rating, 0) / ratingCount).toFixed(1))
        : null;
      const myRating = ratings.find((row) => row.user_id === user?.id)?.rating ?? null;

      const gradeFeedbackCounts: Record<BoulderGradeFeedback, number> = {
        too_easy: 0,
        just_right: 0,
        too_hard: 0,
      };
      let myGradeFeedback: BoulderGradeFeedback | null = null;
      for (const row of gradeFeedbackRows) {
        gradeFeedbackCounts[row.feedback] += 1;
        if (row.user_id === user?.id) {
          myGradeFeedback = row.feedback;
        }
      }

      const selectedAttributeIds = new Set(attributeAssignments.map((assignment) => assignment.attribute_id));

      return {
        averageRating,
        ratingCount,
        myRating,
        gradeFeedbackCounts,
        myGradeFeedback,
        attributes: attributes.map((attribute) => ({
          ...attribute,
          count: selectedAttributeIds.has(attribute.id) ? 1 : 0,
          selected: selectedAttributeIds.has(attribute.id),
        })),
        myTick: myTickRows[0] ?? null,
        tickSummary: tickSummaryRows[0] ?? emptyTickSummary,
      };
    },
  });
}

export function useBoulderAttributeCatalog() {
  const { session, loading, user } = useAuth();

  return useQuery({
    queryKey: ['boulder-attribute-catalog'],
    enabled: !loading && !!session && !!user,
    queryFn: async (): Promise<BoulderAttributeOption[]> => {
      return supabaseRestRequest<BoulderAttributeOption[]>(
        '/rest/v1/boulder_attributes?select=id,key,label,sort_order,is_active&is_active=eq.true&order=sort_order.asc',
        { accessToken: session?.access_token },
      );
    },
  });
}

export function useBoulderAttributeAssignments(boulderId: string | undefined, enabled: boolean = true) {
  const { session, loading, user } = useAuth();

  return useQuery({
    queryKey: ['boulder-attribute-assignments', boulderId],
    enabled: enabled && !loading && !!session && !!user && !!boulderId,
    queryFn: async (): Promise<string[]> => {
      const rows = await supabaseRestRequest<AttributeAssignmentRow[]>(
        `/rest/v1/boulder_attribute_assignments?boulder_id=eq.${boulderId}&select=attribute_id`,
        { accessToken: session?.access_token },
      );

      return rows.map((row) => row.attribute_id);
    },
  });
}

export function useSetBoulderAttributes() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boulderId, attributeIds }: { boulderId: string; attributeIds: string[] }) => {
      if (!user || !session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(
        `/rest/v1/boulder_attribute_assignments?boulder_id=eq.${boulderId}`,
        {
          accessToken: session.access_token,
          method: 'DELETE',
          prefer: 'return=minimal',
        },
      );

      if (attributeIds.length === 0) {
        return;
      }

      await supabaseRestRequest(
        '/rest/v1/boulder_attribute_assignments',
        {
          accessToken: session.access_token,
          method: 'POST',
          prefer: 'return=minimal',
          body: attributeIds.map((attributeId) => ({
            boulder_id: boulderId,
            attribute_id: attributeId,
            assigned_by: user.id,
          })),
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boulder-community', variables.boulderId] });
      queryClient.invalidateQueries({ queryKey: ['boulder-attribute-assignments', variables.boulderId] });
    },
    onError: (error: Error) => {
      toast.error(`Attribute konnten nicht gespeichert werden: ${error.message}`);
    },
  });
}

export function useUpsertBoulderRating(boulderId: string) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rating: number) => {
      if (!user || !session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(
        `/rest/v1/boulder_ratings?on_conflict=boulder_id,user_id`,
        {
          accessToken: session.access_token,
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=minimal',
          body: {
            boulder_id: boulderId,
            user_id: user.id,
            rating,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-community', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['boulder-rating-summaries'] });
    },
    onError: (error: Error) => {
      toast.error(`Bewertung konnte nicht gespeichert werden: ${error.message}`);
    },
  });
}

export function useUpsertBoulderGradeFeedback(boulderId: string) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: BoulderGradeFeedback) => {
      if (!user || !session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(
        `/rest/v1/boulder_grade_feedback?on_conflict=boulder_id,user_id`,
        {
          accessToken: session.access_token,
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=minimal',
          body: {
            boulder_id: boulderId,
            user_id: user.id,
            feedback,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-community', boulderId] });
    },
    onError: (error: Error) => {
      toast.error(`Schwierigkeitsfeedback konnte nicht gespeichert werden: ${error.message}`);
    },
  });
}

export function useUpsertBoulderTick(boulderId: string) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { status: BoulderTickStatus; attemptCount?: number | null; note?: string; isFavorite?: boolean; isProject?: boolean }) => {
      if (!user || !session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(
        `/rest/v1/boulder_ticks?on_conflict=boulder_id,user_id`,
        {
          accessToken: session.access_token,
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=minimal',
          body: {
            boulder_id: boulderId,
            user_id: user.id,
            status: payload.status,
            attempt_count: payload.attemptCount ?? null,
            note: payload.note?.trim() || null,
            is_favorite: payload.isFavorite ?? false,
            is_project: payload.isProject ?? false,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-community', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['my-boulder-ticks'] });
    },
    onError: (error: Error) => {
      toast.error(`Tracking konnte nicht gespeichert werden: ${error.message}`);
    },
  });
}

export function useBoulderTrackingSessions(boulderId: string | undefined) {
  const { session, loading, user } = useAuth();

  return useQuery({
    queryKey: ['boulder-tracking-sessions', boulderId, user?.id],
    enabled: !loading && !!session && !!user && !!boulderId,
    queryFn: async (): Promise<BoulderTrackingSession[]> => {
      return supabaseRestRequest<BoulderTrackingSession[]>(
        `/rest/v1/boulder_tracking_sessions?boulder_id=eq.${boulderId}&user_id=eq.${user?.id}&select=id,boulder_id,user_id,session_date,result,attempt_count,note,created_at,updated_at&order=session_date.desc,created_at.desc`,
        { accessToken: session?.access_token },
      );
    },
  });
}

export function useUpsertBoulderTrackingSession(boulderId: string) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { sessionDate: string; result: BoulderTickStatus; attemptCount: number; note?: string }) => {
      if (!user || !session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      const sessionBody = {
        boulder_id: boulderId,
        user_id: user.id,
        session_date: payload.sessionDate,
        result: payload.result,
        attempt_count: payload.attemptCount,
        note: payload.note?.trim() || null,
      };

      try {
        await supabaseRestRequest('/rest/v1/boulder_tracking_sessions?on_conflict=boulder_id,user_id,session_date', {
          accessToken: session.access_token,
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=minimal',
          body: sessionBody,
        });
        return;
      } catch (error) {
        if (!isMissingDailySessionConflictTarget(error)) {
          throw error;
        }
      }

      const existingSessions = await supabaseRestRequest<Array<{ id: string }>>(
        `/rest/v1/boulder_tracking_sessions?boulder_id=eq.${boulderId}&user_id=eq.${user.id}&session_date=eq.${payload.sessionDate}&select=id&limit=1`,
        { accessToken: session.access_token },
      );

      if (existingSessions[0]) {
        await supabaseRestRequest(
          `/rest/v1/boulder_tracking_sessions?boulder_id=eq.${boulderId}&user_id=eq.${user.id}&session_date=eq.${payload.sessionDate}`,
          {
            accessToken: session.access_token,
            method: 'PATCH',
            prefer: 'return=minimal',
            body: {
              result: payload.result,
              attempt_count: payload.attemptCount,
              note: payload.note?.trim() || null,
            },
          },
        );
        return;
      }

      await supabaseRestRequest('/rest/v1/boulder_tracking_sessions', {
        accessToken: session.access_token,
        method: 'POST',
        prefer: 'return=minimal',
        body: sessionBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-tracking-sessions', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['boulder-community', boulderId] });
    },
    onError: (error: Error) => {
      toast.error(`Session konnte nicht gespeichert werden: ${error.message}`);
    },
  });
}

export function useDeleteBoulderTick(boulderId: string) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user || !session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(
        `/rest/v1/boulder_ticks?boulder_id=eq.${boulderId}&user_id=eq.${user.id}`,
        {
          accessToken: session.access_token,
          method: 'DELETE',
          prefer: 'return=minimal',
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-community', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['my-boulder-ticks'] });
    },
    onError: (error: Error) => {
      toast.error(`Tracking konnte nicht gelöscht werden: ${error.message}`);
    },
  });
}

export function useBoulderComments(boulderId: string | undefined) {
  const { session, loading, user } = useAuth();
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['boulder-comments', boulderId],
    enabled: !loading && !!session && !!user && !!boulderId,
    queryFn: async (): Promise<BoulderComment[]> => {
      const accessToken = session?.access_token;
      const comments = await supabaseRestRequest<
        {
          id: string;
          boulder_id: string;
          user_id: string;
          comment: string;
          created_at: string;
          updated_at: string;
          edited: boolean;
        }[]
      >(
        `/rest/v1/boulder_comments?boulder_id=eq.${boulderId}&select=id,boulder_id,user_id,comment,created_at,updated_at,edited&order=created_at.asc`,
        { accessToken },
      );

      const profileMap = await fetchProfiles(accessToken, [...new Set(comments.map((comment) => comment.user_id))]);

      return comments.map((comment) => {
        const profile = profileMap.get(comment.user_id);
        return {
          ...comment,
          author_name: profile?.full_name || profile?.email || 'Unbekannter Nutzer',
          author_email: profile?.email || null,
        };
      });
    },
  });

  const addComment = useMutation({
    mutationFn: async (comment: string) => {
      if (!user || !session?.access_token || !boulderId) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest('/rest/v1/boulder_comments', {
        accessToken: session.access_token,
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          boulder_id: boulderId,
          user_id: user.id,
          comment: comment.trim(),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-comments', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-boulder-comments'] });
    },
    onError: (error: Error) => {
      toast.error(`Kommentar konnte nicht gespeichert werden: ${error.message}`);
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      if (!session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(`/rest/v1/boulder_comments?id=eq.${id}`, {
        accessToken: session.access_token,
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { comment: comment.trim() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-comments', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-boulder-comments'] });
    },
    onError: (error: Error) => {
      toast.error(`Kommentar konnte nicht aktualisiert werden: ${error.message}`);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(`/rest/v1/boulder_comments?id=eq.${id}`, {
        accessToken: session.access_token,
        method: 'DELETE',
        prefer: 'return=minimal',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder-comments', boulderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-boulder-comments'] });
    },
    onError: (error: Error) => {
      toast.error(`Kommentar konnte nicht gelöscht werden: ${error.message}`);
    },
  });

  return {
    ...commentsQuery,
    addComment,
    updateComment,
    deleteComment,
  };
}

export function useMyTrackedBoulders(limit: number | null = 12) {
  const { session, user, loading } = useAuth();

  return useQuery({
    queryKey: ['my-boulder-ticks', user?.id, limit],
    enabled: !loading && !!session && !!user,
    queryFn: async (): Promise<TrackedBoulderItem[]> => {
      const accessToken = session?.access_token;
      const limitClause = typeof limit === 'number' ? `&limit=${limit}` : '';
      const ticks = await supabaseRestRequest<BoulderTick[]>(
        `/rest/v1/boulder_ticks?user_id=eq.${user?.id}&select=id,boulder_id,user_id,status,attempt_count,note,is_favorite,is_project,created_at,updated_at&order=updated_at.desc${limitClause}`,
        { accessToken },
      );

      const boulderIds = [...new Set(ticks.map((tick) => tick.boulder_id))];
      if (boulderIds.length === 0) {
        return [];
      }

      const boulders = await supabaseRestRequest<BoulderListItem[]>(
        `/rest/v1/boulders?id=in.(${buildInFilter(boulderIds)})&select=id,name,color,difficulty,created_at`,
        { accessToken },
      );
      const boulderMap = new Map(boulders.map((boulder) => [boulder.id, boulder]));

      return ticks.map((tick) => ({
        tick,
        boulder: boulderMap.get(tick.boulder_id) ?? null,
      }));
    },
  });
}

export function useMyTrackingSessions(limit: number | null = null) {
  const { session, user, loading } = useAuth();

  return useQuery({
    queryKey: ['my-tracking-sessions', user?.id, limit],
    enabled: !loading && !!session && !!user,
    queryFn: async (): Promise<BoulderTrackingSession[]> => {
      const accessToken = session?.access_token;
      const limitClause = typeof limit === 'number' ? `&limit=${limit}` : '';

      return supabaseRestRequest<BoulderTrackingSession[]>(
        `/rest/v1/boulder_tracking_sessions?user_id=eq.${user?.id}&select=id,boulder_id,user_id,session_date,result,attempt_count,note,created_at,updated_at&order=session_date.desc,created_at.desc${limitClause}`,
        { accessToken },
      );
    },
  });
}

export function useAdminBoulderComments() {
  const { session, user, loading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-boulder-comments'],
    enabled: !loading && !!session && !!user,
    queryFn: async (): Promise<BoulderComment[]> => {
      const accessToken = session?.access_token;
      const comments = await supabaseRestRequest<
        {
          id: string;
          boulder_id: string;
          user_id: string;
          comment: string;
          created_at: string;
          updated_at: string;
          edited: boolean;
        }[]
      >(
        '/rest/v1/boulder_comments?select=id,boulder_id,user_id,comment,created_at,updated_at,edited&order=created_at.desc',
        { accessToken },
      );

      if (comments.length === 0) {
        return [];
      }

      const [profileMap, boulders] = await Promise.all([
        fetchProfiles(accessToken, [...new Set(comments.map((comment) => comment.user_id))]),
        supabaseRestRequest<BoulderListItem[]>(
          `/rest/v1/boulders?id=in.(${buildInFilter([...new Set(comments.map((comment) => comment.boulder_id))])})&select=id,name,color,difficulty,created_at`,
          { accessToken },
        ),
      ]);

      const boulderMap = new Map(boulders.map((boulder) => [boulder.id, boulder]));

      return comments.map((comment) => {
        const profile = profileMap.get(comment.user_id);
        return {
          ...comment,
          boulder_name: boulderMap.get(comment.boulder_id)?.name || 'Unbekannter Boulder',
          author_name: profile?.full_name || profile?.email || 'Unbekannter Nutzer',
          author_email: profile?.email || null,
        };
      });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) {
        throw new Error('Bitte melde dich an.');
      }

      await supabaseRestRequest(`/rest/v1/boulder_comments?id=eq.${id}`, {
        accessToken: session.access_token,
        method: 'DELETE',
        prefer: 'return=minimal',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-boulder-comments'] });
      queryClient.invalidateQueries({ queryKey: ['boulder-comments'] });
    },
    onError: (error: Error) => {
      toast.error(`Kommentar konnte nicht gelöscht werden: ${error.message}`);
    },
  });

  return {
    ...query,
    deleteComment,
  };
}
