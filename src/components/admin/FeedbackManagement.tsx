import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isWithinInterval, startOfMonth, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  AlertCircle,
  Bug,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Lightbulb,
  MessageSquare,
  Pencil,
  RefreshCcw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type FeedbackType = 'error' | 'bug' | 'feature' | 'general' | 'other';
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
type GroupBy = 'none' | 'status' | 'type' | 'priority' | 'date';
type SortOrder = 'newest' | 'oldest' | 'priority';

interface Feedback {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  user_id: string | null;
  user_email: string | null;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  browser_info: any;
  url: string | null;
  screenshot_url: string | null;
  error_details: any;
  metadata: any;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

const typeIcons: Record<FeedbackType, typeof MessageSquare> = {
  error: AlertCircle,
  bug: Bug,
  feature: Lightbulb,
  general: MessageSquare,
  other: MessageSquare,
};

const statusLabels: Record<FeedbackStatus, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
};

const typeLabels: Record<FeedbackType, string> = {
  error: 'Fehler',
  bug: 'Bug',
  feature: 'Feature',
  general: 'Allgemein',
  other: 'Sonstiges',
};

const priorityLabels: Record<FeedbackPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  critical: 'Kritisch',
};

const statusBadgeClassNames: Record<FeedbackStatus, string> = {
  open: 'border-[#DDE7DF] bg-white text-[#13112B]',
  in_progress: 'border-[#E7D9A6] bg-[#FFF8E4] text-[#13112B]',
  resolved: 'border-[#DDE7DF] bg-[#F7FBF7] text-[#13112B]',
  closed: 'border-[#DDE7DF] bg-[#F5F6F5] text-[#13112B]/72',
};

const priorityBadgeClassNames: Record<FeedbackPriority, string> = {
  low: 'border-[#DDE7DF] bg-white text-[#13112B]/72',
  medium: 'border-[#D8E4F7] bg-[#F6FAFF] text-[#13112B]',
  high: 'border-[#ECD8B1] bg-[#FFF7E9] text-[#13112B]',
  critical: 'border-[#E8C9C0] bg-[#FFF5F2] text-[#C14E37]',
};

function getDateGroupKey(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);

  if (isWithinInterval(d, { start: thisWeek, end: now })) return 'this_week';
  if (isWithinInterval(d, { start: lastWeek, end: thisWeek })) return 'last_week';

  const thisMonth = startOfMonth(now);
  if (d >= thisMonth) return 'this_month';

  const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
  if (d >= lastMonth) return 'last_month';

  return 'older';
}

const dateGroupLabels: Record<string, string> = {
  this_week: 'Diese Woche',
  last_week: 'Letzte Woche',
  this_month: 'Dieser Monat',
  last_month: 'Letzter Monat',
  older: 'Älter',
};

export const FeedbackManagement = () => {
  const queryClient = useQueryClient();
  const { user, session, loading: authLoading } = useAuth();

  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [bulkStatusValue, setBulkStatusValue] = useState<FeedbackStatus>('open');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<{ title: string; description: string; type: FeedbackType }>({
    title: '',
    description: '',
    type: 'general',
  });

  const queriesEnabled = !authLoading && !!user && !!session;

  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ['admin-feedback', statusFilter, typeFilter],
    enabled: queriesEnabled,
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabasePublishableKey) {
        throw new Error('Supabase-Konfiguration fehlt.');
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('Keine aktive Session verfügbar.');
      }

      let queryUrl = `${supabaseUrl}/rest/v1/feedback?select=*&order=created_at.desc`;

      if (statusFilter !== 'all') queryUrl += `&status=eq.${statusFilter}`;
      if (typeFilter !== 'all') queryUrl += `&type=eq.${typeFilter}`;

      const response = await window.fetch(queryUrl, {
        method: 'GET',
        headers: {
          apikey: supabasePublishableKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Feedback konnte nicht geladen werden: ${response.status} ${errorText}`);
      }

      return (await response.json()) as Feedback[];
    },
  });

  const updateSelectedFeedback = (id: string, patch: Partial<Feedback>) => {
    setSelectedFeedback((current) => (current && current.id === id ? { ...current, ...patch } : current));
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = currentUser?.id || null;
      } else {
        updateData.resolved_at = null;
        updateData.resolved_by = null;
      }

      const { error } = await supabase.from('feedback').update(updateData).eq('id', id);
      if (error) throw error;

      return updateData;
    },
    onSuccess: (updateData, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      updateSelectedFeedback(variables.id, updateData as Partial<Feedback>);
      toast.success('Status aktualisiert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: FeedbackPriority }) => {
      const updateData = { priority, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('feedback').update(updateData).eq('id', id);
      if (error) throw error;
      return updateData;
    },
    onSuccess: (updateData, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      updateSelectedFeedback(variables.id, updateData as Partial<Feedback>);
      toast.success('Priorität aktualisiert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token;

      if (!supabaseUrl || !supabasePublishableKey || !accessToken) {
        throw new Error('Supabase oder Session nicht verfügbar.');
      }

      const url = `${supabaseUrl}/rest/v1/feedback?id=eq.${id}`;
      const res = await window.fetch(url, {
        method: 'DELETE',
        headers: {
          apikey: supabasePublishableKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Löschen fehlgeschlagen: ${res.status} ${text}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      setSelectedFeedback(null);
      setDeleteConfirmId(null);
      toast.success('Feedback gelöscht');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Löschen: ${error?.message ?? error}`);
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      type,
    }: {
      id: string;
      title: string;
      description: string;
      type: FeedbackType;
    }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token ?? supabasePublishableKey;

      if (!supabaseUrl || !supabasePublishableKey) {
        throw new Error('Supabase-Konfiguration fehlt.');
      }

      const url = `${supabaseUrl}/rest/v1/feedback?id=eq.${id}`;
      const res = await window.fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabasePublishableKey,
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      updateSelectedFeedback(variables.id, {
        title: variables.title.trim(),
        description: variables.description.trim(),
        type: variables.type,
        updated_at: new Date().toISOString(),
      });
      setIsEditing(false);
      toast.success('Feedback aktualisiert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token;

      if (!supabaseUrl || !supabasePublishableKey || !accessToken) {
        throw new Error('Supabase oder Session nicht verfügbar.');
      }

      const chunkSize = 50;

      for (let index = 0; index < ids.length; index += chunkSize) {
        const chunk = ids.slice(index, index + chunkSize);
        const url = `${supabaseUrl}/rest/v1/feedback?id=in.(${chunk.join(',')})`;
        const res = await window.fetch(url, {
          method: 'DELETE',
          headers: {
            apikey: supabasePublishableKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Löschen fehlgeschlagen: ${res.status} ${text}`);
        }
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setBulkDeleteIds(null);
      toast.success(`${ids.length} Feedback-Einträge gelöscht`);
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Löschen: ${error?.message ?? error}`);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: FeedbackStatus }) => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = currentUser?.id ?? null;
      } else {
        updateData.resolved_at = null;
        updateData.resolved_by = null;
      }

      const { error } = await supabase.from('feedback').update(updateData).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Status aktualisiert');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    },
  });

  const sortedFeedbacks = useMemo(() => {
    if (!feedbacks) return [];

    const list = [...feedbacks];

    if (sortOrder === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return list;
    }

    if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return list;
    }

    const priorityOrder: Record<FeedbackPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    list.sort(
      (a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return list;
  }, [feedbacks, sortOrder]);

  const groupedFeedbacks = useMemo((): { key: string; label: string; items: Feedback[] }[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Alle', items: sortedFeedbacks }];
    }

    const groups = new Map<string, Feedback[]>();

    for (const feedback of sortedFeedbacks) {
      let key: string;

      if (groupBy === 'status') key = feedback.status;
      else if (groupBy === 'type') key = feedback.type;
      else if (groupBy === 'priority') key = feedback.priority;
      else key = getDateGroupKey(feedback.created_at);

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(feedback);
    }

    const labels =
      groupBy === 'status'
        ? statusLabels
        : groupBy === 'type'
          ? typeLabels
          : groupBy === 'priority'
            ? priorityLabels
            : dateGroupLabels;

    const order =
      groupBy === 'status'
        ? (['open', 'in_progress', 'resolved', 'closed'] as const)
        : groupBy === 'type'
          ? (['error', 'bug', 'feature', 'general', 'other'] as const)
          : groupBy === 'priority'
            ? (['critical', 'high', 'medium', 'low'] as const)
            : (['this_week', 'last_week', 'this_month', 'last_month', 'older'] as const);

    return order
      .filter((key) => groups.has(key))
      .map((key) => ({ key, label: labels[key] ?? key, items: groups.get(key)! }));
  }, [groupBy, sortedFeedbacks]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleIds = useMemo(() => sortedFeedbacks.map((feedback) => feedback.id), [sortedFeedbacks]);
  const isAllSelected = sortedFeedbacks.length > 0 && allVisibleIds.every((id) => selectedSet.has(id));
  const isSomeSelected = selectedIds.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((entryId) => entryId !== id) : [...current, id]));
  };

  const toggleExpandedFeedback = (id: string) => {
    setExpandedFeedbackIds((current) =>
      current.includes(id) ? current.filter((entryId) => entryId !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds([...allVisibleIds]);
  };

  const clearSelection = () => setSelectedIds([]);

  const handleOpenDetail = (feedback: Feedback, openInEditMode = false) => {
    setSelectedFeedback(feedback);
    setEditForm({ title: feedback.title, description: feedback.description, type: feedback.type });
    setIsEditing(openInEditMode);
  };

  const handleSaveEdit = () => {
    if (!selectedFeedback) return;

    if (!editForm.title.trim()) {
      toast.error('Titel darf nicht leer sein.');
      return;
    }

    updateFeedbackMutation.mutate({
      id: selectedFeedback.id,
      title: editForm.title,
      description: editForm.description,
      type: editForm.type,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Feedback</div>
          <h2 className="text-[1.32rem] font-semibold tracking-[-0.02em] text-[#13112B]">
            Meldungen und Ideen bearbeiten
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#13112B]/58">
            Lade offene Rückmeldungen und bereite die Bearbeitung vor.
          </p>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const openFeedbacks = feedbacks?.filter((feedback) => feedback.status === 'open').length || 0;
  const totalFeedbacks = feedbacks?.length || 0;
  const resolvedFeedbacks = feedbacks?.filter((feedback) => feedback.status === 'resolved').length || 0;

  return (
    <div className="space-y-5 w-full min-w-0">
      <section className="space-y-2">
        <div className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Feedback</div>
        <h2 className="text-[1.32rem] font-semibold tracking-[-0.02em] text-[#13112B]">
          Meldungen und Ideen bearbeiten
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[#13112B]/58">
          Prüfe offene Rückmeldungen, aktualisiere Status und halte wichtige Fehler oder Ideen direkt an einem Ort fest.
        </p>
        <div className="text-xs text-[#13112B]/58">
          {totalFeedbacks} Einträge / {openFeedbacks} offen / {resolvedFeedbacks} gelöst
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Filter</div>
          <p className="mt-2 text-sm text-[#13112B]/58">
            Filtere nach Status, Typ, Gruppierung und Sortierung, um schneller zum passenden Eintrag zu kommen.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#13112B]">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FeedbackStatus | 'all')}>
              <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#DDE7DF]">
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#13112B]">Typ</Label>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FeedbackType | 'all')}>
              <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#DDE7DF]">
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="error">Fehler</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="general">Allgemein</SelectItem>
                <SelectItem value="other">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#13112B]">Gruppierung</Label>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
              <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#DDE7DF]">
                <SelectItem value="none">Keine</SelectItem>
                <SelectItem value="status">Nach Status</SelectItem>
                <SelectItem value="type">Nach Typ</SelectItem>
                <SelectItem value="priority">Nach Priorität</SelectItem>
                <SelectItem value="date">Nach Datum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#13112B]">Sortierung</Label>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
              <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#DDE7DF]">
                <SelectItem value="newest">Neueste zuerst</SelectItem>
                <SelectItem value="oldest">Älteste zuerst</SelectItem>
                <SelectItem value="priority">Nach Priorität</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="self-end">
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl border-[#DDE7DF] bg-white px-0 text-[#13112B] sm:px-4 xl:w-auto"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-feedback'] })}
            >
              <RefreshCcw className="h-4 w-4 xl:mr-2" />
              <span className="sr-only xl:not-sr-only xl:inline">Neu laden</span>
            </Button>
          </div>
        </div>
      </section>

      {isSomeSelected ? (
        <section className="rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <span className="text-sm font-medium text-[#13112B]">{selectedIds.length} ausgewählt</span>
            <Select value={bulkStatusValue} onValueChange={(value) => setBulkStatusValue(value as FeedbackStatus)}>
              <SelectTrigger className="h-10 w-full rounded-xl border-[#DDE7DF] bg-white sm:w-[210px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#DDE7DF]">
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="rounded-xl bg-[#36B531] text-white hover:bg-[#2FA12B]"
                onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: bulkStatusValue })}
                disabled={bulkStatusMutation.isPending}
              >
                Status setzen
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-[#E8C9C0] bg-white text-[#C14E37] hover:bg-[#FFF5F2]"
                onClick={() => setBulkDeleteIds([...selectedIds])}
              >
                Ausgewählte löschen
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
                onClick={clearSelection}
              >
                Auswahl aufheben
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Feedbackliste</div>
            <p className="mt-2 text-sm text-[#13112B]/58">{sortedFeedbacks.length} sichtbare Einträge</p>
          </div>
          {sortedFeedbacks.length > 0 ? (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Alle auswählen"
              />
              <button
                type="button"
                className="text-sm font-medium text-[#36B531] hover:underline"
                onClick={toggleSelectAll}
              >
                {isAllSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
              </button>
            </div>
          ) : null}
        </div>

        {sortedFeedbacks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFEFC] px-5 py-6 text-sm text-[#13112B]/58">
            Kein passendes Feedback gefunden.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedFeedbacks.map((group) => (
              <div key={group.key} className="space-y-3">
                {groupBy !== 'none' ? (
                  <div className="flex items-center gap-2 px-1 text-sm font-medium text-[#13112B]/80">
                    <ChevronDown className="h-4 w-4" />
                    {group.label} ({group.items.length})
                  </div>
                ) : null}

                <div className="space-y-4">
                  {group.items.map((feedback) => {
                    const TypeIcon = typeIcons[feedback.type];
                    const isExpanded = expandedFeedbackIds.includes(feedback.id);

                    return (
                      <article key={feedback.id} className="rounded-2xl border border-[#DDE7DF] bg-white">
                        <button
                          type="button"
                          onClick={() => toggleExpandedFeedback(feedback.id)}
                          className="w-full px-4 py-4 text-left md:px-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                                <Checkbox
                                  checked={selectedSet.has(feedback.id)}
                                  onCheckedChange={() => toggleSelect(feedback.id)}
                                  aria-label={`${feedback.title} auswählen`}
                                />
                                <TypeIcon className="h-4 w-4 shrink-0 text-[#13112B]/72" />
                                <h3 className="min-w-0 truncate text-base font-semibold text-[#13112B] md:text-lg">
                                  {feedback.title}
                                </h3>
                              </div>

                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#13112B]/62">
                                {feedback.description || 'Keine Beschreibung hinterlegt.'}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn('rounded-lg px-3 py-1 text-[11px] font-semibold', statusBadgeClassNames[feedback.status])}
                                >
                                  {statusLabels[feedback.status]}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn('rounded-lg px-3 py-1 text-[11px] font-semibold', priorityBadgeClassNames[feedback.priority])}
                                >
                                  {priorityLabels[feedback.priority]}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="rounded-lg border-[#DDE7DF] bg-white px-3 py-1 text-[11px] font-semibold text-[#13112B]/72"
                                >
                                  {typeLabels[feedback.type]}
                                </Badge>
                              </div>

                              <div className="mt-3 flex flex-col gap-2 text-sm text-[#13112B]/68 sm:flex-row sm:flex-wrap sm:gap-x-5">
                                <span>{feedback.user_email || 'Gast'}</span>
                                <span>{format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                                {feedback.url ? <span>URL vorhanden</span> : null}
                              </div>
                            </div>

                            <ChevronDown
                              className={cn(
                                'mt-1 h-5 w-5 shrink-0 text-[#13112B]/42 transition-transform duration-200',
                                isExpanded && 'rotate-180',
                              )}
                            />
                          </div>
                        </button>

                        {isExpanded ? (
                          <div className="border-t border-[#DDE7DF] px-4 py-4 md:px-5">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                              <div className="space-y-4">
                                <div>
                                  <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
                                    Beschreibung
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#13112B]/72">
                                    {feedback.description || 'Keine Beschreibung hinterlegt.'}
                                  </p>
                                </div>

                                {feedback.screenshot_url ? (
                                  <div className="space-y-2">
                                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
                                      Screenshot
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-[#DDE7DF] bg-white">
                                      <img src={feedback.screenshot_url} alt="Screenshot" className="w-full object-cover" />
                                    </div>
                                  </div>
                                ) : null}

                                {feedback.url ? (
                                  <div className="space-y-2">
                                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
                                      URL
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                      <div className="min-w-0 flex-1 truncate rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] px-4 py-3 text-sm text-[#13112B]/72">
                                        {feedback.url}
                                      </div>
                                      <Button
                                        variant="outline"
                                        className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
                                        onClick={() => window.open(feedback.url!, '_blank')}
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Öffnen
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-[#13112B]">Status</Label>
                                  <Select
                                    value={feedback.status}
                                    onValueChange={(value) =>
                                      updateStatusMutation.mutate({ id: feedback.id, status: value as FeedbackStatus })
                                    }
                                  >
                                    <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF] bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-[#DDE7DF]">
                                      <SelectItem value="open">Offen</SelectItem>
                                      <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                                      <SelectItem value="resolved">Gelöst</SelectItem>
                                      <SelectItem value="closed">Geschlossen</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-[#13112B]">Priorität</Label>
                                  <Select
                                    value={feedback.priority}
                                    onValueChange={(value) =>
                                      updatePriorityMutation.mutate({ id: feedback.id, priority: value as FeedbackPriority })
                                    }
                                  >
                                    <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF] bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-[#DDE7DF]">
                                      <SelectItem value="low">Niedrig</SelectItem>
                                      <SelectItem value="medium">Mittel</SelectItem>
                                      <SelectItem value="high">Hoch</SelectItem>
                                      <SelectItem value="critical">Kritisch</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] px-4 py-3">
                                  <div className="space-y-2 text-sm text-[#13112B]/72">
                                    <div className="flex items-start justify-between gap-3">
                                      <span>Typ</span>
                                      <span className="text-right text-[#13112B]">{typeLabels[feedback.type]}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                      <span>Von</span>
                                      <span className="text-right text-[#13112B]">{feedback.user_email || 'Gast'}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                      <span>Erstellt</span>
                                      <span className="text-right text-[#13112B]">
                                        {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                                      </span>
                                    </div>
                                    {feedback.resolved_at ? (
                                      <div className="flex items-start justify-between gap-3">
                                        <span>Gelöst am</span>
                                        <span className="text-right text-[#13112B]">
                                          {format(new Date(feedback.resolved_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <Button
                                variant="outline"
                                className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
                                onClick={() => handleOpenDetail(feedback)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Details
                              </Button>
                              <Button
                                className="rounded-xl bg-[#36B531] text-white hover:bg-[#2FA12B]"
                                onClick={() => handleOpenDetail(feedback, true)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Bearbeiten
                              </Button>
                              <Button
                                variant="outline"
                                className="rounded-xl border-[#E8C9C0] bg-white text-[#C14E37] hover:bg-[#FFF5F2]"
                                onClick={() => setDeleteConfirmId(feedback.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Löschen
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl border-[#DDE7DF]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#13112B]">Feedback löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieses Feedback wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkDeleteIds?.length} onOpenChange={(open) => !open && setBulkDeleteIds(null)}>
        <AlertDialogContent className="rounded-2xl border-[#DDE7DF]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#13112B]">
              {bulkDeleteIds?.length} Feedback-Einträge löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Die ausgewählten Einträge werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteIds?.length && bulkDeleteMutation.mutate(bulkDeleteIds)}
            >
              Alle löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedFeedback ? (
        <Dialog
          open={!!selectedFeedback}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedFeedback(null);
              setIsEditing(false);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl border-[#DDE7DF] p-0 sm:max-w-[700px]">
            <DialogHeader className="px-6 pb-4 pt-6">
              <DialogTitle className="flex items-center gap-2 text-xl font-heading font-bold text-[#13112B]">
                {(() => {
                  const TypeIcon = typeIcons[isEditing ? editForm.type : selectedFeedback.type];
                  return <TypeIcon className="h-5 w-5 shrink-0" />;
                })()}
                <span className="truncate">{isEditing ? 'Feedback bearbeiten' : selectedFeedback.title}</span>
              </DialogTitle>
              <DialogDescription className="text-sm text-[#13112B]/60">
                Feedback vom {format(new Date(selectedFeedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-[#DDE7DF] text-[#13112B] hover:bg-[#F7FBF7]"
                    onClick={() => {
                      setEditForm({
                        title: selectedFeedback.title,
                        description: selectedFeedback.description,
                        type: selectedFeedback.type,
                      });
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className="h-9 rounded-xl bg-[#36B531] hover:bg-[#2FA12B]"
                      onClick={handleSaveEdit}
                      disabled={updateFeedbackMutation.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-[#DDE7DF]"
                      onClick={() => {
                        setEditForm({
                          title: selectedFeedback.title,
                          description: selectedFeedback.description,
                          type: selectedFeedback.type,
                        });
                        setIsEditing(false);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Abbrechen
                    </Button>
                  </>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Status</Label>
                  <Select
                    value={selectedFeedback.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({ id: selectedFeedback.id, status: value as FeedbackStatus })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#DDE7DF]">
                      <SelectItem value="open">Offen</SelectItem>
                      <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                      <SelectItem value="resolved">Gelöst</SelectItem>
                      <SelectItem value="closed">Geschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Priorität</Label>
                  <Select
                    value={selectedFeedback.priority}
                    onValueChange={(value) =>
                      updatePriorityMutation.mutate({ id: selectedFeedback.id, priority: value as FeedbackPriority })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#DDE7DF]">
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                      <SelectItem value="critical">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Titel</Label>
                  <Input
                    value={editForm.title}
                    onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                    className="h-11 rounded-xl border-[#DDE7DF]"
                    placeholder="Titel"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#13112B]">Typ</Label>
                {isEditing ? (
                  <Select
                    value={editForm.type}
                    onValueChange={(value) => setEditForm((current) => ({ ...current, type: value as FeedbackType }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#DDE7DF]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#DDE7DF]">
                      <SelectItem value="error">Fehler</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="general">Allgemein</SelectItem>
                      <SelectItem value="other">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] p-3 text-sm text-[#13112B]">
                    {typeLabels[selectedFeedback.type]}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#13112B]">Beschreibung</Label>
                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[120px] rounded-xl border-[#DDE7DF]"
                    placeholder="Beschreibung"
                  />
                ) : (
                  <div className="whitespace-pre-wrap rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] p-4 text-sm text-[#13112B]">
                    {selectedFeedback.description}
                  </div>
                )}
              </div>

              {selectedFeedback.screenshot_url ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Screenshot</Label>
                  <div className="overflow-hidden rounded-xl border border-[#DDE7DF]">
                    <img src={selectedFeedback.screenshot_url} alt="Screenshot" className="h-auto max-h-96 w-full object-contain" />
                  </div>
                </div>
              ) : null}

              {selectedFeedback.url ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">URL</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] p-3 text-sm text-[#13112B]">
                      {selectedFeedback.url}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl border-[#DDE7DF] hover:bg-[#F7FBF7]"
                      onClick={() => window.open(selectedFeedback.url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {selectedFeedback.error_details ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Fehlerdetails</Label>
                  <ScrollArea className="h-32 rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] p-4">
                    <pre className="text-xs whitespace-pre-wrap text-[#13112B]">
                      {JSON.stringify(selectedFeedback.error_details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              ) : null}

              {selectedFeedback.browser_info ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Browser-Informationen</Label>
                  <ScrollArea className="h-32 rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] p-4">
                    <pre className="text-xs whitespace-pre-wrap text-[#13112B]">
                      {JSON.stringify(selectedFeedback.browser_info, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              ) : null}

              {selectedFeedback.metadata && Object.keys(selectedFeedback.metadata).length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Metadaten</Label>
                  <ScrollArea className="h-32 rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] p-4">
                    <pre className="text-xs whitespace-pre-wrap text-[#13112B]">
                      {JSON.stringify(selectedFeedback.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              ) : null}

              <div className="grid gap-4 border-t border-[#DDE7DF] pt-4 text-sm sm:grid-cols-2">
                <div>
                  <Label className="text-[#13112B]/60">Von</Label>
                  <div className="text-[#13112B]">{selectedFeedback.user_email || 'Gast'}</div>
                </div>
                {selectedFeedback.resolved_at ? (
                  <div>
                    <Label className="text-[#13112B]/60">Gelöst am</Label>
                    <div className="text-[#13112B]">
                      {format(new Date(selectedFeedback.resolved_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};
