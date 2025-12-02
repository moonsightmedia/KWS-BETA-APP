import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  Trash2
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

export const FeedbackManagement = () => {
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');

  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ['admin-feedback', statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[FeedbackManagement] Error loading feedback:', error);
        throw error;
      }

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
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Feedback gelöscht');
      setSelectedFeedback(null);
    },
    onError: (error: any) => {
      toast.error('Fehler beim Löschen: ' + error.message);
    },
  });

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Gesamt</div>
          <div className="text-2xl font-bold">{totalFeedbacks}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Offen</div>
          <div className="text-2xl font-bold text-blue-500">{openFeedbacks}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Gelöst</div>
          <div className="text-2xl font-bold text-green-500">
            {feedbacks?.filter(f => f.status === 'resolved').length || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FeedbackStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="in_progress">In Bearbeitung</SelectItem>
              <SelectItem value="resolved">Gelöst</SelectItem>
              <SelectItem value="closed">Geschlossen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FeedbackType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="error">Fehler</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="general">Allgemein</SelectItem>
              <SelectItem value="other">Sonstiges</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-feedback'] })}
        >
          Aktualisieren
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priorität</TableHead>
                <TableHead>Von</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Kein Feedback gefunden
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks?.map((feedback) => {
                  const TypeIcon = typeIcons[feedback.type];
                  return (
                    <TableRow key={feedback.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <span className="capitalize">{feedback.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate" title={feedback.title}>
                          {feedback.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[feedback.status]}>
                          {feedback.status === 'open' && 'Offen'}
                          {feedback.status === 'in_progress' && 'In Bearbeitung'}
                          {feedback.status === 'resolved' && 'Gelöst'}
                          {feedback.status === 'closed' && 'Geschlossen'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[feedback.priority]}>
                          {feedback.priority === 'low' && 'Niedrig'}
                          {feedback.priority === 'medium' && 'Mittel'}
                          {feedback.priority === 'high' && 'Hoch'}
                          {feedback.priority === 'critical' && 'Kritisch'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {feedback.user_email || 'Gast'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFeedback(feedback)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(feedback.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Detail Dialog */}
      {selectedFeedback && (
        <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const TypeIcon = typeIcons[selectedFeedback.type];
                  return <TypeIcon className="h-5 w-5" />;
                })()}
                {selectedFeedback.title}
              </DialogTitle>
              <DialogDescription>
                Feedback vom {format(new Date(selectedFeedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Status and Priority Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedFeedback.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({ id: selectedFeedback.id, status: value as FeedbackStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Offen</SelectItem>
                      <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                      <SelectItem value="resolved">Gelöst</SelectItem>
                      <SelectItem value="closed">Geschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priorität</Label>
                  <Select
                    value={selectedFeedback.priority}
                    onValueChange={(value) =>
                      updatePriorityMutation.mutate({ id: selectedFeedback.id, priority: value as FeedbackPriority })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                      <SelectItem value="critical">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <div className="border rounded-lg p-4 bg-muted whitespace-pre-wrap">
                  {selectedFeedback.description}
                </div>
              </div>

              {/* Screenshot */}
              {selectedFeedback.screenshot_url && (
                <div className="space-y-2">
                  <Label>Screenshot</Label>
                  <div className="border rounded-lg overflow-hidden">
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
                  <Label>URL</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border rounded-lg p-2 bg-muted text-sm truncate">
                      {selectedFeedback.url}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
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
                  <Label>Fehlerdetails</Label>
                  <ScrollArea className="h-32 border rounded-lg p-4 bg-muted">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(selectedFeedback.error_details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Browser Info */}
              {selectedFeedback.browser_info && (
                <div className="space-y-2">
                  <Label>Browser-Informationen</Label>
                  <ScrollArea className="h-32 border rounded-lg p-4 bg-muted">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(selectedFeedback.browser_info, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Metadata */}
              {selectedFeedback.metadata && Object.keys(selectedFeedback.metadata).length > 0 && (
                <div className="space-y-2">
                  <Label>Metadaten</Label>
                  <ScrollArea className="h-32 border rounded-lg p-4 bg-muted">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(selectedFeedback.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Von</Label>
                  <div>{selectedFeedback.user_email || 'Gast'}</div>
                </div>
                {selectedFeedback.resolved_at && (
                  <div>
                    <Label className="text-muted-foreground">Gelöst am</Label>
                    <div>
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

