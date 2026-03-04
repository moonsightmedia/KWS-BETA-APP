import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  AlertCircle,
  ExternalLink,
  Eye,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  Download,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type FeedbackType = 'error' | 'bug' | 'feature' | 'general' | 'other';
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

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

const statusColors: Record<FeedbackStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

const priorityColors: Record<FeedbackPriority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-400',
  high: 'bg-orange-400',
  critical: 'bg-red-500',
};

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

type GroupBy = 'none' | 'status' | 'type' | 'priority' | 'date';
type SortOrder = 'newest' | 'oldest' | 'priority';

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

      // Build query URL with filters
      let queryUrl = `${SUPABASE_URL}/rest/v1/feedback?select=*&order=created_at.desc`;
      
      if (statusFilter !== 'all') {
        queryUrl += `&status=eq.${statusFilter}`;
      }

      if (typeFilter !== 'all') {
        queryUrl += `&type=eq.${typeFilter}`;
      }

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
        throw new Error(`Failed to load feedback: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data as Feedback[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'resolved' && !updateData.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id || null;
      }

      const { error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Status aktualisiert');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: FeedbackPriority }) => {
      const { error } = await supabase
        .from('feedback')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Priorität aktualisiert');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token;
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !accessToken) {
        throw new Error('Supabase oder Session nicht verfügbar');
      }
      const url = `${SUPABASE_URL}/rest/v1/feedback?id=eq.${id}`;
      const res = await window.fetch(url, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
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
      toast.success('Feedback gelöscht');
      setSelectedFeedback(null);
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast.error('Fehler beim Löschen: ' + (error?.message ?? error));
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
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }
      const url = `${SUPABASE_URL}/rest/v1/feedback?id=eq.${id}`;
      const res = await window.fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
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
      setSelectedFeedback((prev) =>
        prev && prev.id === variables.id
          ? {
              ...prev,
              title: variables.title.trim(),
              description: variables.description.trim(),
              type: variables.type,
              updated_at: new Date().toISOString(),
            }
          : prev
      );
      setIsEditing(false);
      toast.success('Feedback aktualisiert');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Speichern: ' + error.message);
    },
  });

  const BULK_DELETE_CHUNK_SIZE = 50;

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token;
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !accessToken) {
        throw new Error('Supabase oder Session nicht verfügbar');
      }
      // Chunk IDs to avoid URL length limit (e.g. 2048) – one DELETE per chunk
      for (let i = 0; i < ids.length; i += BULK_DELETE_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + BULK_DELETE_CHUNK_SIZE);
        const filter = chunk.join(',');
        const url = `${SUPABASE_URL}/rest/v1/feedback?id=in.(${filter})`;
        const res = await window.fetch(url, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
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
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setBulkDeleteIds(null);
      toast.success(`${ids.length} Feedback-Einträge gelöscht`);
    },
    onError: (error: any) => {
      toast.error('Fehler beim Löschen: ' + (error?.message ?? error));
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: FeedbackStatus }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id ?? null;
      }
      const { error } = await supabase
        .from('feedback')
        .update(updateData)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Status aktualisiert');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });

  const sortedFeedbacks = useMemo(() => {
    if (!feedbacks) return [];
    const list = [...feedbacks];
    if (sortOrder === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      const prioOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      list.sort(
        (a, b) =>
          prioOrder[a.priority] - prioOrder[b.priority] ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return list;
  }, [feedbacks, sortOrder]);

  const groupedFeedbacks = useMemo((): { key: string; label: string; items: Feedback[] }[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Alle', items: sortedFeedbacks }];
    }
    const groups = new Map<string, Feedback[]>();
    for (const f of sortedFeedbacks) {
      let key: string;
      if (groupBy === 'status') key = f.status;
      else if (groupBy === 'type') key = f.type;
      else if (groupBy === 'priority') key = f.priority;
      else key = getDateGroupKey(f.created_at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
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
      .filter((k) => groups.has(k))
      .map((k) => ({ key: k, label: labels[k] ?? k, items: groups.get(k)! }));
  }, [sortedFeedbacks, groupBy]);

  // Export all feedback data as JSON
  const handleExport = () => {
    if (!feedbacks || feedbacks.length === 0) {
      toast.error('Keine Daten zum Exportieren vorhanden');
      return;
    }
    
    const exportData = {
      exported_at: new Date().toISOString(),
      count: feedbacks.length,
      filters: {
        status: statusFilter,
        type: typeFilter,
        groupBy,
        sortOrder,
      },
      feedbacks: feedbacks.map(f => ({
        id: f.id,
        type: f.type,
        title: f.title,
        description: f.description,
        status: f.status,
        priority: f.priority,
        user_email: f.user_email,
        user_id: f.user_id,
        url: f.url,
        screenshot_url: f.screenshot_url,
        browser_info: f.browser_info,
        error_details: f.error_details,
        metadata: f.metadata,
        created_at: f.created_at,
        updated_at: f.updated_at,
        resolved_at: f.resolved_at,
        resolved_by: f.resolved_by,
      })),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${feedbacks.length} Feedback-Einträge exportiert`);
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleIds = useMemo(() => sortedFeedbacks.map((f) => f.id), [sortedFeedbacks]);
  const isAllSelected =
    sortedFeedbacks.length > 0 && allVisibleIds.every((id) => selectedSet.has(id));
  const isSomeSelected = selectedIds.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds([...allVisibleIds]);
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
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const openFeedbacks = feedbacks?.filter(f => f.status === 'open').length || 0;
  const totalFeedbacks = feedbacks?.length || 0;

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-[#13112B]/60">Gesamt</div>
            <div className="text-xl sm:text-2xl font-bold text-[#13112B]">{totalFeedbacks}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-[#13112B]/60">Offen</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-500">{openFeedbacks}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-[#13112B]/60">Gelöst</div>
            <div className="text-xl sm:text-2xl font-bold text-[#36B531]">
              {feedbacks?.filter(f => f.status === 'resolved').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <div className="space-y-2 flex-1">
          <Label className="text-sm font-medium text-[#13112B]">Status</Label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FeedbackStatus | 'all')}>
            <SelectTrigger className="w-full h-11 rounded-xl border-[#E7F7E9]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E7F7E9]">
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="in_progress">In Bearbeitung</SelectItem>
              <SelectItem value="resolved">Gelöst</SelectItem>
              <SelectItem value="closed">Geschlossen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1">
          <Label className="text-sm font-medium text-[#13112B]">Typ</Label>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FeedbackType | 'all')}>
            <SelectTrigger className="w-full h-11 rounded-xl border-[#E7F7E9]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E7F7E9]">
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="error">Fehler</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="general">Allgemein</SelectItem>
              <SelectItem value="other">Sonstiges</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1">
          <Label className="text-sm font-medium text-[#13112B]">Gruppierung</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-full h-11 rounded-xl border-[#E7F7E9]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E7F7E9]">
              <SelectItem value="none">Keine</SelectItem>
              <SelectItem value="status">Nach Status</SelectItem>
              <SelectItem value="type">Nach Typ</SelectItem>
              <SelectItem value="priority">Nach Priorität</SelectItem>
              <SelectItem value="date">Nach Datum</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1">
          <Label className="text-sm font-medium text-[#13112B]">Sortierung</Label>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-full h-11 rounded-xl border-[#E7F7E9]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E7F7E9]">
              <SelectItem value="newest">Neueste zuerst</SelectItem>
              <SelectItem value="oldest">Älteste zuerst</SelectItem>
              <SelectItem value="priority">Nach Priorität</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] w-full sm:w-auto"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-feedback'] })}
        >
          Aktualisieren
        </Button>

        <Button
          variant="outline"
          className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] w-full sm:w-auto"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportieren
        </Button>
      </div>

      {/* Bulk action bar */}
      {isSomeSelected && (
        <Card className="bg-[#E7F7E9]/30 border border-[#E7F7E9] rounded-xl">
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[#13112B]">
              {selectedIds.length} ausgewählt
            </span>
            <Select
              value={bulkStatusValue}
              onValueChange={(v) => setBulkStatusValue(v as FeedbackStatus)}
            >
              <SelectTrigger className="h-9 w-[180px] rounded-xl border-[#E7F7E9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E7F7E9]">
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9 rounded-xl bg-[#36B531] hover:bg-[#2d9a29]"
              onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: bulkStatusValue })}
              disabled={bulkStatusMutation.isPending}
            >
              Status setzen
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-red-200 text-destructive hover:bg-red-50"
              onClick={() => setBulkDeleteIds([...selectedIds])}
            >
              Ausgewählte löschen
            </Button>
            <Button variant="ghost" size="sm" className="h-9 rounded-xl" onClick={clearSelection}>
              Auswahl aufheben
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block border border-[#E7F7E9] rounded-xl bg-white overflow-hidden shadow-sm">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E7F7E9]">
                <TableHead className="w-12 pr-0">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Alle auswählen"
                  />
                </TableHead>
                <TableHead className="text-[#13112B] font-medium">Typ</TableHead>
                <TableHead className="text-[#13112B] font-medium">Titel</TableHead>
                <TableHead className="text-[#13112B] font-medium">Status</TableHead>
                <TableHead className="text-[#13112B] font-medium">Priorität</TableHead>
                <TableHead className="text-[#13112B] font-medium">Von</TableHead>
                <TableHead className="text-[#13112B] font-medium">Erstellt</TableHead>
                <TableHead className="text-right text-[#13112B] font-medium">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFeedbacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-[#13112B]/60 py-8">
                    Kein Feedback gefunden
                  </TableCell>
                </TableRow>
              ) : (
                groupedFeedbacks.map((group) => (
                  <React.Fragment key={group.key}>
                    {groupBy !== 'none' && (
                      <TableRow className="bg-[#F9FAF9] border-b border-[#E7F7E9]">
                        <TableCell colSpan={8} className="py-2">
                          <span className="font-medium text-[#13112B] flex items-center gap-2">
                            <ChevronDown className="h-4 w-4" />
                            {group.label} ({group.items.length})
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {group.items.map((feedback) => {
                      const TypeIcon = typeIcons[feedback.type];
                      return (
                        <TableRow key={feedback.id} className="border-b border-[#E7F7E9]">
                          <TableCell className="w-12 pr-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedSet.has(feedback.id)}
                              onCheckedChange={() => toggleSelect(feedback.id)}
                              aria-label={`${feedback.title} auswählen`}
                            />
                          </TableCell>
                          <TableCell className="text-[#13112B]">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4" />
                              <span>{typeLabels[feedback.type]}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#13112B]">
                            <div className="max-w-[300px] truncate" title={feedback.title}>
                              {feedback.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[feedback.status]} rounded-xl text-white`}>
                              {statusLabels[feedback.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${priorityColors[feedback.priority]} rounded-xl text-white`}>
                              {priorityLabels[feedback.priority]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#13112B]/60">
                            <div className="text-sm">{feedback.user_email || 'Gast'}</div>
                          </TableCell>
                          <TableCell className="text-[#13112B]/60">
                            <div className="text-sm">
                              {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-xl hover:bg-[#E7F7E9]"
                                onClick={() => handleOpenDetail(feedback)}
                                title="Details anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-xl hover:bg-[#E7F7E9]"
                                onClick={() => handleOpenDetail(feedback, true)}
                                title="Bearbeiten"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-xl hover:bg-red-50 text-destructive"
                                onClick={() => setDeleteConfirmId(feedback.id)}
                                title="Löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 w-full min-w-0">
        {sortedFeedbacks.length > 0 && (
          <div className="flex items-center gap-2 px-1">
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
        )}
        {sortedFeedbacks.length === 0 ? (
          <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
            <CardContent className="p-8 text-center text-[#13112B]/60">
              Kein Feedback gefunden
            </CardContent>
          </Card>
        ) : (
          groupedFeedbacks.map((group) => (
            <div key={group.key} className="space-y-3">
              {groupBy !== 'none' && (
                <h3 className="text-sm font-medium text-[#13112B]/80 flex items-center gap-2 px-1">
                  <ChevronDown className="h-4 w-4" />
                  {group.label} ({group.items.length})
                </h3>
              )}
              {group.items.map((feedback) => {
                const TypeIcon = typeIcons[feedback.type];
                return (
                  <Card
                    key={feedback.id}
                    className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleOpenDetail(feedback)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedSet.has(feedback.id)}
                            onCheckedChange={() => toggleSelect(feedback.id)}
                            aria-label={`${feedback.title} auswählen`}
                          />
                          <TypeIcon className="h-5 w-5 text-[#13112B] flex-shrink-0" />
                          <h3 className="font-semibold text-base text-[#13112B] truncate">{feedback.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${statusColors[feedback.status]} rounded-xl text-white text-xs`}>
                            {statusLabels[feedback.status]}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge className={`${priorityColors[feedback.priority]} rounded-xl text-white text-xs`}>
                          {priorityLabels[feedback.priority]}
                        </Badge>
                        <span className="text-xs text-[#13112B]/60">{typeLabels[feedback.type]}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="text-[#13112B]/60 truncate flex-1 min-w-0">
                          {feedback.user_email || 'Gast'}
                        </div>
                        <div className="text-[#13112B]/60 flex-shrink-0 ml-2">
                          {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E7F7E9]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(feedback);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(feedback, true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 rounded-xl border-[#E7F7E9] hover:bg-red-50 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(feedback.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl border-[#E7F7E9]">
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

      {/* Bulk delete confirmation */}
      <AlertDialog open={!!bulkDeleteIds?.length} onOpenChange={(open) => !open && setBulkDeleteIds(null)}>
        <AlertDialogContent className="rounded-2xl border-[#E7F7E9]">
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
              onClick={() =>
                bulkDeleteIds?.length &&
                bulkDeleteMutation.mutate(bulkDeleteIds)
              }
            >
              Alle löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      {selectedFeedback && (
        <Dialog
          open={!!selectedFeedback}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedFeedback(null);
              setIsEditing(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-heading font-bold text-[#13112B]">
                {(() => {
                  const TypeIcon = typeIcons[isEditing ? editForm.type : selectedFeedback.type];
                  return <TypeIcon className="h-5 w-5 flex-shrink-0" />;
                })()}
                <span className="truncate">{isEditing ? 'Feedback bearbeiten' : selectedFeedback.title}</span>
              </DialogTitle>
              <DialogDescription className="text-sm text-[#13112B]/60">
                Feedback vom {format(new Date(selectedFeedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 pb-6">
              {/* Edit bar: Bearbeiten / Speichern / Abbrechen */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                    onClick={() => {
                      setEditForm({
                        title: selectedFeedback.title,
                        description: selectedFeedback.description,
                        type: selectedFeedback.type,
                      });
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className="h-9 rounded-xl bg-[#36B531] hover:bg-[#2d9a29]"
                      onClick={handleSaveEdit}
                      disabled={updateFeedbackMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-[#E7F7E9]"
                      onClick={() => {
                        setEditForm({
                          title: selectedFeedback.title,
                          description: selectedFeedback.description,
                          type: selectedFeedback.type,
                        });
                        setIsEditing(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  </>
                )}
              </div>

              {/* Status and Priority Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Status</Label>
                  <Select
                    value={selectedFeedback.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({ id: selectedFeedback.id, status: value as FeedbackStatus })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#E7F7E9]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E7F7E9]">
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
                    <SelectTrigger className="h-11 rounded-xl border-[#E7F7E9]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E7F7E9]">
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                      <SelectItem value="critical">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title (editable when isEditing) */}
              {isEditing && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Titel</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="h-11 rounded-xl border-[#E7F7E9]"
                    placeholder="Titel"
                  />
                </div>
              )}

              {/* Type (editable when isEditing) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#13112B]">Typ</Label>
                {isEditing ? (
                  <Select
                    value={editForm.type}
                    onValueChange={(value) => setEditForm((f) => ({ ...f, type: value as FeedbackType }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#E7F7E9]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E7F7E9]">
                      <SelectItem value="error">Fehler</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="general">Allgemein</SelectItem>
                      <SelectItem value="other">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="border border-[#E7F7E9] rounded-xl p-3 bg-[#F9FAF9] text-sm text-[#13112B]">
                    {typeLabels[selectedFeedback.type]}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#13112B]">Beschreibung</Label>
                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="min-h-[120px] rounded-xl border-[#E7F7E9]"
                    placeholder="Beschreibung"
                  />
                ) : (
                  <div className="border border-[#E7F7E9] rounded-xl p-4 bg-[#F9FAF9] whitespace-pre-wrap text-sm text-[#13112B]">
                    {selectedFeedback.description}
                  </div>
                )}
              </div>

              {/* Screenshot */}
              {selectedFeedback.screenshot_url && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Screenshot</Label>
                  <div className="border border-[#E7F7E9] rounded-xl overflow-hidden">
                    <img
                      src={selectedFeedback.screenshot_url}
                      alt="Screenshot"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* URL */}
              {selectedFeedback.url && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">URL</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-[#E7F7E9] rounded-xl p-2 bg-[#F9FAF9] text-sm text-[#13112B] truncate">
                      {selectedFeedback.url}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-[#E7F7E9] hover:bg-[#E7F7E9]"
                      onClick={() => window.open(selectedFeedback.url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedFeedback.error_details && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Fehlerdetails</Label>
                  <ScrollArea className="h-32 border border-[#E7F7E9] rounded-xl p-4 bg-[#F9FAF9]">
                    <pre className="text-xs whitespace-pre-wrap text-[#13112B]">
                      {JSON.stringify(selectedFeedback.error_details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Browser Info */}
              {selectedFeedback.browser_info && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Browser-Informationen</Label>
                  <ScrollArea className="h-32 border border-[#E7F7E9] rounded-xl p-4 bg-[#F9FAF9]">
                    <pre className="text-xs whitespace-pre-wrap text-[#13112B]">
                      {JSON.stringify(selectedFeedback.browser_info, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Metadata */}
              {selectedFeedback.metadata && Object.keys(selectedFeedback.metadata).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#13112B]">Metadaten</Label>
                  <ScrollArea className="h-32 border border-[#E7F7E9] rounded-xl p-4 bg-[#F9FAF9]">
                    <pre className="text-xs whitespace-pre-wrap text-[#13112B]">
                      {JSON.stringify(selectedFeedback.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-[#E7F7E9]">
                <div>
                  <Label className="text-[#13112B]/60">Von</Label>
                  <div className="text-[#13112B]">{selectedFeedback.user_email || 'Gast'}</div>
                </div>
                {selectedFeedback.resolved_at && (
                  <div>
                    <Label className="text-[#13112B]/60">Gelöst am</Label>
                    <div className="text-[#13112B]">
                      {format(new Date(selectedFeedback.resolved_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

