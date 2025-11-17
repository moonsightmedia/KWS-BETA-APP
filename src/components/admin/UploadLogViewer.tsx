import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { Search, Download, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UploadLog {
  id: string;
  upload_session_id: string;
  boulder_id: string | null;
  file_name: string;
  file_size: number;
  file_type: 'video' | 'thumbnail';
  upload_type: 'allinkl' | 'supabase';
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'failed' | 'duplicate';
  progress: number;
  error_message: string | null;
  error_details: any;
  final_url: string | null;
  chunk_info: any;
  device_info: any;
  network_info: any;
  retry_count: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  compressing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  uploading: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  duplicate: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  compressing: RefreshCw,
  uploading: RefreshCw,
  completed: CheckCircle2,
  failed: XCircle,
  duplicate: AlertCircle,
};

export const UploadLogViewer = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<UploadLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['upload-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upload_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Limit to last 500 logs

      if (error) throw error;
      return data as UploadLog[];
    },
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    let filtered = logs;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.file_type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.file_name.toLowerCase().includes(query) ||
        log.upload_session_id.toLowerCase().includes(query) ||
        (log.boulder_id && log.boulder_id.toLowerCase().includes(query)) ||
        (log.error_message && log.error_message.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [logs, statusFilter, typeFilter, searchQuery]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDuration = (started: string, completed: string | null): string => {
    if (!completed) return 'Läuft...';
    const start = new Date(started);
    const end = new Date(completed);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const exportLogs = () => {
    if (!filteredLogs || filteredLogs.length === 0) return;

    const csv = [
      ['Session ID', 'Dateiname', 'Typ', 'Status', 'Größe', 'Progress', 'Fehler', 'URL', 'Gestartet', 'Abgeschlossen', 'Dauer'].join(','),
      ...filteredLogs.map(log => [
        log.upload_session_id,
        `"${log.file_name}"`,
        log.file_type,
        log.status,
        log.file_size,
        log.progress,
        `"${log.error_message || ''}"`,
        `"${log.final_url || ''}"`,
        log.started_at,
        log.completed_at || '',
        formatDuration(log.started_at, log.completed_at),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `upload-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StatusIcon = STATUS_ICONS[selectedLog?.status || 'pending'] || FileText;

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upload-Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs} disabled={!filteredLogs || filteredLogs.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 w-full min-w-0">
        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <Input
              placeholder="Suche nach Dateiname, Session-ID, Boulder-ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="compressing">Komprimierung</SelectItem>
              <SelectItem value="uploading">Upload läuft</SelectItem>
              <SelectItem value="completed">Erfolgreich</SelectItem>
              <SelectItem value="failed">Fehlgeschlagen</SelectItem>
              <SelectItem value="duplicate">Duplikat</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="thumbnail">Thumbnail</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Lade Logs...</div>
        ) : !filteredLogs || filteredLogs.length === 0 ? (
          <div className="text-sm text-muted-foreground">Keine Logs gefunden.</div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'Log' : 'Logs'} gefunden
            </div>
            <ScrollArea className="h-[400px] sm:h-[600px]">
              <div className="space-y-2 pr-2 sm:pr-4">
                {filteredLogs.map((log) => {
                  const StatusIcon = STATUS_ICONS[log.status] || FileText;
                  return (
                    <div
                      key={log.id}
                      className="border rounded-lg p-2 sm:p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                            <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-xs sm:text-sm truncate flex-1 min-w-0">{log.file_name}</span>
                            <Badge variant="outline" className={`${STATUS_COLORS[log.status]} text-[10px] sm:text-xs px-1 sm:px-2`}>
                              {log.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2">
                              {log.file_type}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Session: <code className="text-[10px]">{log.upload_session_id.slice(0, 8)}...</code></div>
                            <div className="flex items-center gap-4">
                              <span>{formatFileSize(log.file_size)}</span>
                              {log.status === 'uploading' || log.status === 'compressing' ? (
                                <span>Progress: {log.progress}%</span>
                              ) : null}
                              <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: de })}</span>
                            </div>
                            {log.error_message && (
                              <div className="text-red-600 truncate">
                                Fehler: {log.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        {log.final_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(log.final_url!, '_blank');
                            }}
                          >
                            Öffnen
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Upload-Log Details</DialogTitle>
              <DialogDescription>
                Vollständige Informationen zum Upload
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="max-h-[60vh] pr-2 sm:pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Dateiname</div>
                      <div className="font-medium">{selectedLog.file_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      <Badge variant="outline" className={STATUS_COLORS[selectedLog.status]}>
                        {selectedLog.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Typ</div>
                      <div>{selectedLog.file_type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Upload-Typ</div>
                      <div>{selectedLog.upload_type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Dateigröße</div>
                      <div>{formatFileSize(selectedLog.file_size)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Progress</div>
                      <div>{selectedLog.progress}%</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Session-ID</div>
                      <code className="text-[10px] sm:text-xs break-all break-words overflow-wrap-anywhere block">{selectedLog.upload_session_id}</code>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Retry Count</div>
                      <div>{selectedLog.retry_count}</div>
                    </div>
                  </div>

                  {selectedLog.final_url && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Finale URL</div>
                      <a
                        href={selectedLog.final_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm text-primary hover:underline break-all break-words overflow-wrap-anywhere block"
                      >
                        {selectedLog.final_url}
                      </a>
                    </div>
                  )}

                  {selectedLog.error_message && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Fehler</div>
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {selectedLog.error_message}
                      </div>
                    </div>
                  )}

                  {selectedLog.error_details && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Fehler-Details</div>
                      <pre className="text-[10px] sm:text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 sm:max-h-40">
                        {JSON.stringify(selectedLog.error_details, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.device_info && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Device-Info</div>
                      <pre className="text-[10px] sm:text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 sm:max-h-40">
                        {JSON.stringify(selectedLog.device_info, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.network_info && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Network-Info</div>
                      <pre className="text-[10px] sm:text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 sm:max-h-40">
                        {JSON.stringify(selectedLog.network_info, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.chunk_info && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Chunk-Info</div>
                      <pre className="text-[10px] sm:text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 sm:max-h-40">
                        {JSON.stringify(selectedLog.chunk_info, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Gestartet</div>
                      <div className="text-sm">
                        {new Date(selectedLog.started_at).toLocaleString('de-DE')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(selectedLog.started_at), { addSuffix: true, locale: de })}
                      </div>
                    </div>
                    {selectedLog.completed_at && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Abgeschlossen</div>
                        <div className="text-sm">
                          {new Date(selectedLog.completed_at).toLocaleString('de-DE')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dauer: {formatDuration(selectedLog.started_at, selectedLog.completed_at)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

