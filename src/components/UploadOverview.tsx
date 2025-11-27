import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUploadTracker } from '@/hooks/useUploadTracker';
import { Loader2, X, AlertCircle, CheckCircle2, Upload, Video, Image, RefreshCw, FileDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface UploadOverviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadOverview = ({ open, onOpenChange }: UploadOverviewProps) => {
  const { activeUploads, hasActiveUploads, cancelUpload, refetch } = useUploadTracker();
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const isMobile = useIsMobile();

  // Update current time every second to keep elapsed time display fresh
  useEffect(() => {
    if (!hasActiveUploads) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [hasActiveUploads]);

  // Group uploads by boulder_id
  const groupedUploads = useMemo(() => {
    const groups = new Map<string | null, typeof activeUploads>();
    
    activeUploads.forEach(upload => {
      const key = upload.boulder_id || 'standalone';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(upload);
    });
    
    return groups;
  }, [activeUploads]);

  const handleCancel = async (sessionId: string) => {
    setCancellingIds(prev => new Set(prev).add(sessionId));
    try {
      await cancelUpload(sessionId);
      toast.success('Upload abgebrochen');
      await refetch();
    } catch (error) {
      console.error('[UploadOverview] Failed to cancel upload:', error);
      toast.error('Fehler beim Abbrechen des Uploads');
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'uploading':
      case 'compressing':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      default:
        return <Upload className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Fertig</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fehlgeschlagen</Badge>;
      case 'uploading':
        return <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">Hochladen</Badge>;
      case 'compressing':
        return <Badge variant="default" className="bg-yellow-50 text-yellow-700 border-yellow-200">Komprimieren</Badge>;
      case 'pending':
        return <Badge variant="outline">Wartend</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const Content = () => (
    <div className="space-y-4">
      {!hasActiveUploads ? (
        <div className="text-center py-8 text-muted-foreground">
          <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Keine aktiven Uploads</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {activeUploads.length} {activeUploads.length === 1 ? 'Upload' : 'Uploads'} aktiv
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Aktualisieren
            </Button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {Array.from(groupedUploads.entries()).map(([boulderId, uploads]) => (
              <div key={boulderId || 'standalone'} className="border rounded-lg p-4 space-y-3">
                {boulderId && boulderId !== 'standalone' && (
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Boulder: {boulderId}</h4>
                    <Badge variant="outline" className="text-xs">
                      {uploads.length} {uploads.length === 1 ? 'Datei' : 'Dateien'}
                    </Badge>
                  </div>
                )}
                
                {uploads.map((upload) => {
                  // Calculate time elapsed if started_at is available
                  // Use currentTime state to force re-render every second
                  const getTimeElapsed = () => {
                    if (!upload.started_at) return null;
                    const start = new Date(upload.started_at).getTime();
                    const now = currentTime; // Use state instead of Date.now() for reactivity
                    const elapsed = Math.floor((now - start) / 1000); // seconds
                    if (elapsed < 0) return '0s'; // Handle edge case
                    if (elapsed < 60) return `${elapsed}s`;
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    return `${minutes}m ${seconds}s`;
                  };

                  // Get detailed status message for compressing
                  const getCompressingMessage = () => {
                    if (upload.status !== 'compressing') return null;
                    const progress = upload.progress || 0;
                    if (progress < 10) return 'Initialisiere Komprimierung...';
                    if (progress < 25) return 'Analysiere Video...';
                    if (progress < 40) return 'Komprimiere Video...';
                    if (progress < 50) return 'Finalisiere Komprimierung...';
                    return 'Komprimierung abgeschlossen';
                  };

                  // Format file size if available (from upload_logs table)
                  const formatFileSize = (bytes?: number) => {
                    if (!bytes) return null;
                    if (bytes < 1024) return `${bytes} B`;
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                  };

                  return (
                    <div key={upload.upload_session_id} className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {upload.file_type === 'video' ? (
                            <Video className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          ) : (
                            <Image className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{upload.file_name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {getStatusIcon(upload.status)}
                              {getStatusBadge(upload.status)}
                              {upload.progress > 0 && upload.progress < 100 && (
                                <span className="text-xs font-semibold text-primary">
                                  {Math.round(upload.progress)}%
                                </span>
                              )}
                              {getTimeElapsed() && (
                                <span className="text-xs text-muted-foreground">
                                  • {getTimeElapsed()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {['pending', 'compressing', 'uploading'].includes(upload.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(upload.upload_session_id)}
                            disabled={cancellingIds.has(upload.upload_session_id)}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            {cancellingIds.has(upload.upload_session_id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {/* Detailed compressing status */}
                      {upload.status === 'compressing' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Zap className="w-3 h-3 text-yellow-600 animate-pulse" />
                            <span className="font-medium">{getCompressingMessage()}</span>
                          </div>
                          <div className="relative">
                            <Progress 
                              value={upload.progress || 0} 
                              className="h-3 bg-muted"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-[10px] font-semibold text-primary drop-shadow-sm">
                                {Math.round(upload.progress || 0)}% Komprimierung
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            {getTimeElapsed() && (
                              <span className="flex items-center gap-1">
                                <span>⏱️</span>
                                <span className="font-medium">{getTimeElapsed()} verstrichen</span>
                              </span>
                            )}
                            {upload.progress !== undefined && upload.progress > 0 && upload.progress < 100 && (
                              <span className="flex items-center gap-1">
                                <FileDown className="w-3 h-3 animate-pulse" />
                                <span>Verarbeitung läuft...</span>
                              </span>
                            )}
                            {(upload.progress === undefined || upload.progress === 0) && (
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Starte Komprimierung...</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Uploading status */}
                      {upload.status === 'uploading' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Upload className="w-3 h-3 text-blue-600 animate-pulse" />
                            <span className="font-medium">
                              {upload.progress < 20 ? 'Vorbereitung...' :
                               upload.progress < 50 ? 'Hochladen...' :
                               upload.progress < 80 ? 'Upload läuft...' :
                               upload.progress < 95 ? 'Fast fertig...' :
                               'Finalisiere...'}
                            </span>
                          </div>
                          <Progress value={upload.progress} className="h-2" />
                          {getTimeElapsed() && (
                            <div className="text-xs text-muted-foreground">
                              ⏱️ {getTimeElapsed()} verstrichen
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Pending status */}
                      {upload.status === 'pending' && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Warte auf Start...</span>
                        </div>
                      )}
                      
                      {/* Failed status */}
                      {upload.status === 'failed' && upload.error_message && (
                        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                          {upload.error_message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Upload-Übersicht</SheetTitle>
            <SheetDescription>
              Alle aktiven Uploads in der App
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Content />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload-Übersicht</DialogTitle>
          <DialogDescription>
            Alle aktiven Uploads in der App
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <Content />
        </div>
      </DialogContent>
    </Dialog>
  );
};

