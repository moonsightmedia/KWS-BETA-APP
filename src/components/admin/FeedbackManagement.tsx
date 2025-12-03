import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

        <Button
          variant="outline"
          className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] w-full sm:w-auto"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-feedback'] })}
        >
          Aktualisieren
        </Button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border border-[#E7F7E9] rounded-xl bg-white overflow-hidden shadow-sm">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E7F7E9]">
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
              {feedbacks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[#13112B]/60 py-8">
                    Kein Feedback gefunden
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks?.map((feedback) => {
                  const TypeIcon = typeIcons[feedback.type];
                  return (
                    <TableRow key={feedback.id} className="border-b border-[#E7F7E9]">
                      <TableCell className="text-[#13112B]">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <span className="capitalize">{feedback.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#13112B]">
                        <div className="max-w-[300px] truncate" title={feedback.title}>
                          {feedback.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[feedback.status]} rounded-xl text-white`}>
                          {feedback.status === 'open' && 'Offen'}
                          {feedback.status === 'in_progress' && 'In Bearbeitung'}
                          {feedback.status === 'resolved' && 'Gelöst'}
                          {feedback.status === 'closed' && 'Geschlossen'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${priorityColors[feedback.priority]} rounded-xl text-white`}>
                          {feedback.priority === 'low' && 'Niedrig'}
                          {feedback.priority === 'medium' && 'Mittel'}
                          {feedback.priority === 'high' && 'Hoch'}
                          {feedback.priority === 'critical' && 'Kritisch'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#13112B]/60">
                        <div className="text-sm">
                          {feedback.user_email || 'Gast'}
                        </div>
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
                            onClick={() => setSelectedFeedback(feedback)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl hover:bg-red-50 text-destructive"
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 w-full min-w-0">
        {feedbacks?.length === 0 ? (
          <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
            <CardContent className="p-8 text-center text-[#13112B]/60">
              Kein Feedback gefunden
            </CardContent>
          </Card>
        ) : (
          feedbacks?.map((feedback) => {
            const TypeIcon = typeIcons[feedback.type];
            return (
              <Card 
                key={feedback.id} 
                className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedFeedback(feedback)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TypeIcon className="h-5 w-5 text-[#13112B] flex-shrink-0" />
                      <h3 className="font-semibold text-base text-[#13112B] truncate">{feedback.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${statusColors[feedback.status]} rounded-xl text-white text-xs`}>
                        {feedback.status === 'open' && 'Offen'}
                        {feedback.status === 'in_progress' && 'In Bearbeitung'}
                        {feedback.status === 'resolved' && 'Gelöst'}
                        {feedback.status === 'closed' && 'Geschlossen'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge className={`${priorityColors[feedback.priority]} rounded-xl text-white text-xs`}>
                      {feedback.priority === 'low' && 'Niedrig'}
                      {feedback.priority === 'medium' && 'Mittel'}
                      {feedback.priority === 'high' && 'Hoch'}
                      {feedback.priority === 'critical' && 'Kritisch'}
                    </Badge>
                    <span className="text-xs text-[#13112B]/60 capitalize">{feedback.type}</span>
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
                      className="flex-1 h-10 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFeedback(feedback);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 w-10 rounded-xl border-[#E7F7E9] hover:bg-red-50 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(feedback.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      {selectedFeedback && (
        <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
          <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-heading font-bold text-[#13112B]">
                {(() => {
                  const TypeIcon = typeIcons[selectedFeedback.type];
                  return <TypeIcon className="h-5 w-5" />;
                })()}
                {selectedFeedback.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#13112B]/60">
                Feedback vom {format(new Date(selectedFeedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 pb-6">
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

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#13112B]">Beschreibung</Label>
                <div className="border border-[#E7F7E9] rounded-xl p-4 bg-[#F9FAF9] whitespace-pre-wrap text-sm text-[#13112B]">
                  {selectedFeedback.description}
                </div>
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

