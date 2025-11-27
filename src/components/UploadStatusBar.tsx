import { useUploadTracker } from '@/hooks/useUploadTracker';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  X,
  RefreshCw,
  Square
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  compressing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  uploading: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  duplicate: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const STATUS_ICONS: Record<string, any> = {
  pending: AlertCircle,
  compressing: RefreshCw,
  uploading: Upload,
  completed: CheckCircle2,
  failed: XCircle,
  duplicate: AlertCircle,
};

export function UploadStatusBar() {
  const { activeUploads, hasActiveUploads, cancelUpload } = useUploadTracker();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedUploads, setDismissedUploads] = useState<Set<string>>(new Set());
  const [cancellingUploads, setCancellingUploads] = useState<Set<string>>(new Set());

  // Filter out dismissed uploads and uploads that are part of a batch upload
  // Batch uploads are shown in the BatchUpload dialog, so we hide them here to avoid confusion
  const visibleUploads = activeUploads.filter(
    (upload) => 
      !dismissedUploads.has(upload.upload_session_id) &&
      // Hide uploads that belong to a boulder (these are shown in BatchUpload dialog)
      upload.boulder_id === null
  );

  // Hide UploadStatusBar completely if there are any batch uploads active (uploads with boulder_id)
  // This prevents confusion when batch uploads are running
  const hasBatchUploads = activeUploads.some(upload => upload.boulder_id !== null);
  
  if (!hasActiveUploads || visibleUploads.length === 0 || hasBatchUploads) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const dismissUpload = (sessionId: string) => {
    setDismissedUploads((prev) => new Set([...prev, sessionId]));
  };

  const handleCancelUpload = async (sessionId: string, fileName: string) => {
    if (cancellingUploads.has(sessionId)) return;
    
    setCancellingUploads((prev) => new Set([...prev, sessionId]));
    try {
      await cancelUpload(sessionId);
      toast.success(`Upload "${fileName}" wurde abgebrochen`);
      dismissUpload(sessionId);
    } catch (error) {
      console.error('[UploadStatusBar] Failed to cancel upload:', error);
      toast.error('Fehler beim Abbrechen des Uploads');
    } finally {
      setCancellingUploads((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-full max-w-sm sm:max-w-md shadow-lg border-2 sm:bottom-4 sm:right-4 bottom-2 right-2 left-2 sm:left-auto">
      <div className="p-2 sm:p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Upload className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold text-xs sm:text-sm truncate">
              {visibleUploads.length} {visibleUploads.length === 1 ? 'Upload' : 'Uploads'} aktiv
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
            >
              {isExpanded ? 'Weniger' : 'Mehr'}
            </Button>
          </div>
        </div>

        {isExpanded ? (
          <ScrollArea className="max-h-[60vh] sm:max-h-96">
            <div className="space-y-2 pr-2">
              {visibleUploads.map((upload) => {
                const StatusIcon = STATUS_ICONS[upload.status] || Upload;
                const isActive = ['pending', 'compressing', 'uploading'].includes(upload.status);
                const isCancelling = cancellingUploads.has(upload.upload_session_id);

                return (
                  <div
                    key={upload.upload_session_id}
                    className="border rounded-lg p-2 sm:p-3 space-y-2 bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          <StatusIcon
                            className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                              isActive ? 'animate-spin' : ''
                            }`}
                          />
                          <span className="text-xs sm:text-sm font-medium truncate flex-1 min-w-0">
                            {upload.file_name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`${STATUS_COLORS[upload.status]} text-[10px] sm:text-xs px-1 sm:px-2 flex-shrink-0`}
                          >
                            {upload.status}
                          </Badge>
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {upload.file_type} •{' '}
                          {formatDistanceToNow(new Date(upload.started_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelUpload(upload.upload_session_id, upload.file_name)}
                            disabled={isCancelling}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Upload abbrechen"
                          >
                            <Square className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissUpload(upload.upload_session_id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          title="Ausblenden"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>

                    {isActive && (
                      <div className="space-y-1">
                        <Progress value={upload.progress} className="h-1.5 sm:h-2" />
                        <div className="text-[10px] sm:text-xs text-muted-foreground text-right">
                          {Math.round(upload.progress)}%
                        </div>
                      </div>
                    )}

                    {upload.status === 'failed' && upload.error_message && (
                      <div className="text-[10px] sm:text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-1.5 sm:p-2 rounded break-words">
                        {upload.error_message}
                      </div>
                    )}

                    {upload.status === 'completed' && (
                      <div className="text-[10px] sm:text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        Erfolgreich hochgeladen
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {visibleUploads.slice(0, 2).map((upload) => {
              const StatusIcon = STATUS_ICONS[upload.status] || Upload;
              const isActive = ['pending', 'compressing', 'uploading'].includes(upload.status);

              return (
                <div
                  key={upload.upload_session_id}
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <StatusIcon
                    className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${isActive ? 'animate-spin' : ''}`}
                  />
                  <span className="truncate flex-1 min-w-0">{upload.file_name}</span>
                  {isActive && (
                    <span className="text-muted-foreground text-xs sm:text-sm flex-shrink-0">
                      {Math.round(upload.progress)}%
                    </span>
                  )}
                </div>
              );
            })}
            {visibleUploads.length > 2 && (
              <div className="text-xs sm:text-sm text-muted-foreground text-center">
                +{visibleUploads.length - 2} weitere
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

