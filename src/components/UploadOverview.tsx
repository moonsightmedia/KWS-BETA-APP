import React, { useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertCircle, Loader2, FileVideo, Image as ImageIcon, CloudUpload, RefreshCw, X, Trash2 } from 'lucide-react';
import { useUpload } from '@/contexts/UploadContext';
import { cn } from '@/lib/utils';

import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { isNativeVideoPipelineAvailable } from '@/utils/nativeVideoUpload';
import { pickNativeVideoForUpload } from '@/utils/nativeVideoPicker';
import type { UploadStatus } from '@/types/upload';

const statusLabels: Record<UploadStatus, string> = {
  pending: 'Wird vorbereitet', queued: 'In Warteschlange', compressing: 'Wird komprimiert',
  uploading: 'Wird übertragen', retrying: 'Neuer Versuch', waiting_network: 'Wartet auf Verbindung',
  completed: 'Übertragen', error: 'Fehlgeschlagen', failed: 'Fehlgeschlagen', cancelled: 'Abgebrochen',
  restoring: 'Datei benötigt', server_processing: 'Verarbeitung auf dem Server', recovery_review: 'Status prüfen',
};

type UploadOverviewProps = {
  placement?: 'floating' | 'inline';
};

export const UploadOverview = ({ placement = 'floating' }: UploadOverviewProps) => {
  const { uploads, resumeUpload, cancelUpload, removeUpload, recoveryStatus = 'ready', retryRecovery } = useUpload();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const suppressDialogCloseUntilRef = useRef(0);
  const isNativeApp = Capacitor.isNativePlatform();
  const useNativeVideoPicker = isNativeVideoPipelineAvailable();

  const extendDialogCloseSuppression = (durationMs = 1500) => {
    suppressDialogCloseUntilRef.current = Date.now() + durationMs;
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && Date.now() < suppressDialogCloseUntilRef.current) {
      return;
    }
    setIsOpen(nextOpen);
  };

  // Show on all setter routes so interrupted uploads can be resumed after edit/reopen.
  const isSetterArea = location.pathname.startsWith('/setter');
  const hasPageUploadDock = location.pathname.replace(/\/+$/, '') === '/setter/create';

  // Creation owns a shared dock with its FAB and batch footer. Never render a
  // second, globally positioned trigger on top of that page's primary action.
  if (!isSetterArea || (hasPageUploadDock && placement === 'floating')) return null;

  const activeUploads = uploads;

  // Keep the overview reachable even when there are no uploads yet.

  const uploadingCount = activeUploads.filter(u => ['uploading', 'pending', 'queued', 'compressing', 'retrying'].includes(u.status)).length;
  const waitingCount = activeUploads.filter(u => u.status === 'waiting_network').length;
  const errorCount = activeUploads.filter(u => u.status === 'error' || u.status === 'failed').length;
  const restoringCount = activeUploads.filter(u => u.status === 'restoring').length;
  const processingCount = activeUploads.filter(u => u.status === 'server_processing').length;
  const reviewCount = activeUploads.filter(u => u.status === 'recovery_review').length;
  const attentionCount = uploadingCount + restoringCount + errorCount + waitingCount + processingCount + reviewCount;
  const summary = recoveryStatus === 'checking' ? 'Status wird geprüft' : recoveryStatus === 'error' ? 'Status nicht verfügbar'
    : uploadingCount ? `${uploadingCount} Upload${uploadingCount === 1 ? '' : 's'} aktiv`
    : reviewCount ? `${reviewCount} Status prüfen`
    : restoringCount ? `${restoringCount} Datei${restoringCount === 1 ? '' : 'en'} benötigt`
    : errorCount ? `${errorCount} fehlgeschlagen`
    : waitingCount ? `${waitingCount} ohne Verbindung`
    : processingCount ? `${processingCount} in Verarbeitung` : '';
  const showSummary = Boolean(summary);

  const handleFileSelect = async (sessionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      await resumeUpload(sessionId, file);
      toast.success('Datei ausgewählt. Upload wird fortgesetzt …');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error('Fehler beim Fortsetzen: ' + message);
    }
    
    // Reset input
    if (fileInputRefs.current[sessionId]) {
      fileInputRefs.current[sessionId]!.value = '';
    }
    extendDialogCloseSuppression(1000);
  };

  const triggerFileSelect = async (sessionId: string) => {
    extendDialogCloseSuppression(8000);
    const upload = uploads.find((item) => item.sessionId === sessionId);

    // On iOS, re-picking video via <input> breaks the native upload path.
    // Use the same Capgo/native picker as create flow.
    if (upload?.type === 'video' && useNativeVideoPicker) {
      try {
        const nativeVideo = await pickNativeVideoForUpload();
        if (!nativeVideo) return;
        await resumeUpload(sessionId, nativeVideo);
        toast.success('Datei ausgewählt. Upload wird fortgesetzt …');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        toast.error('Fehler beim Fortsetzen: ' + message);
      }
      return;
    }

    fileInputRefs.current[sessionId]?.click();
  };

  const handleCancel = async (sessionId: string) => {
    await cancelUpload(sessionId);
    toast.success('Upload abgebrochen');
  };

  const handleRemove = async (sessionId: string) => {
    const upload = uploads.find(u => u.sessionId === sessionId);
    const wasLastUpload = uploads.length === 1;
    
    await removeUpload(sessionId);
    toast.success(`Upload "${upload?.fileName || 'unbekannt'}" entfernt`);
    
    // Close dialog if it was the last upload, after a short delay
    if (wasLastUpload && isOpen) {
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button
          ref={triggerRef}
          variant="default"
          size="lg"
          aria-label="Upload-Übersicht öffnen"
          title="Upload-Übersicht"
          className={cn(
            "rounded-kws-card shadow-soft transition-colors duration-200 flex items-center justify-center gap-3",
            placement === 'inline'
              ? "pointer-events-auto min-w-0 max-w-[calc(100%-4.25rem)]"
              : "upload-overview-trigger fixed left-4 md:left-auto md:right-8 z-30",
            showSummary ? cn("px-4 h-14", placement === 'floating' && "max-w-[calc(100vw-6rem)] md:max-w-none") : "h-14 w-14 shrink-0 p-0",
            "bg-background text-foreground hover:bg-secondary",
            (errorCount > 0 || recoveryStatus === 'error') && "text-destructive"
          )}
        >
          {recoveryStatus === 'checking' ? <Loader2 className="h-6 w-6 shrink-0 animate-spin motion-reduce:animate-none" />
            : errorCount > 0 || reviewCount > 0 || recoveryStatus === 'error' ? <AlertCircle className="h-6 w-6 shrink-0" />
            : <Upload className="h-6 w-6 shrink-0 text-primary" />}
          {showSummary && (
            <div className="flex min-w-0 flex-col items-start text-sm text-left">
              <span className="font-semibold whitespace-normal leading-tight">{summary}</span>
              {uploadingCount > 0 && attentionCount > uploadingCount && <span className="text-xs text-muted-foreground">Weitere Einträge prüfen</span>}
            </div>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent
        scrollLayout="contained"
        className="flex max-h-[85dvh] flex-col overflow-hidden p-0 md:max-w-[560px]"
        onOpenAutoFocus={event => { event.preventDefault(); closeRef.current?.focus(); }}
        onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus(); }}
        onKeyDown={event => {
          // Also handle an immediate Escape while the document-level Radix
          // listener is still mounting. Respect nested controls and file pickers.
          if (event.key === 'Escape' && !event.defaultPrevented) {
            event.preventDefault();
            handleDialogOpenChange(false);
          }
        }}
        onInteractOutside={(event) => {
          if (isNativeApp) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isNativeApp) event.preventDefault();
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <CloudUpload className="h-6 w-6 shrink-0 text-primary" />
            <div><DialogTitle>Upload-Übersicht</DialogTitle>
              <DialogDescription>Aktuelle Übertragungen und wiederhergestellte Einträge.</DialogDescription></div>
          </div>
          <Button ref={closeRef} variant="ghost" size="icon" aria-label="Upload-Übersicht schließen" onClick={() => setIsOpen(false)} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:px-5">
          <div className="space-y-4">
            {recoveryStatus !== 'ready' && <div role="status" className="rounded-kws-control bg-secondary p-3 text-sm">
              {recoveryStatus === 'checking' ? 'Gespeicherte Uploads werden abgeglichen …' : 'Gespeicherte Uploads konnten nicht geprüft werden. Bitte erneut versuchen.'}
            </div>}
            {activeUploads.length === 0 && recoveryStatus === 'ready' && (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                    <CheckCircle2 className="w-10 h-10 mb-3 text-primary" />
                    <p className="font-semibold text-foreground">Keine offenen Uploads</p>
                    <p className="mt-1 text-sm">Für dein Konto gibt es nichts fortzusetzen.</p>
                </div>
            )}
            {activeUploads.map((upload) => (
              <div key={upload.sessionId} className={cn(
                  "border-b border-border pb-4 last:border-b-0 last:pb-0"
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                        "p-2 rounded-kws-control flex-shrink-0 bg-secondary text-muted-foreground"
                    )}>
                        {upload.type === 'video' ? <FileVideo className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm break-all" title={upload.fileName}>
                            {upload.fileName}
                        </h4>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {['uploading', 'compressing', 'queued', 'retrying', 'pending'].includes(upload.status) && <Loader2 className="w-3 h-3 animate-spin" />}
                            {upload.status === 'waiting_network' && <RefreshCw className="w-3 h-3" />}
                            {upload.status === 'restoring' && <RefreshCw className="w-3 h-3" />}
                            {(upload.status === 'error' || upload.status === 'failed') && <AlertCircle className="w-3 h-3" />}
                            {upload.status === 'cancelled' && <X className="w-3 h-3" />}
                            {statusLabels[upload.status]}
                        </span>
                        {upload.recoveredAt && <span className="mt-1 block text-xs text-muted-foreground">Vom {new Date(upload.recoveredAt).toLocaleDateString('de-DE')}</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {upload.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    
                    {(['uploading', 'pending', 'queued', 'compressing', 'retrying', 'waiting_network'].includes(upload.status)) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(upload.sessionId)}
                        className="h-11 w-11 p-0 text-destructive"
                        aria-label={`Upload ${upload.fileName} abbrechen`}
                        title="Upload abbrechen"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                    
                    {(upload.status === 'error' || upload.status === 'failed' || upload.status === 'restoring' || upload.status === 'completed' || upload.status === 'cancelled') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(upload.sessionId)}
                        className="h-11 w-11 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Upload ${upload.fileName} entfernen`}
                        title="Upload entfernen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {!['restoring', 'recovery_review', 'server_processing', 'cancelled'].includes(upload.status) && <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Übertragung</span>
                    <span>{Math.max(0, Math.min(100, upload.progress || 0)).toFixed(0)} %</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-[2px] bg-secondary">
                    <div 
                      className={cn(
                        "h-full rounded-[2px] transition-[width] duration-200 motion-reduce:transition-none",
                        (upload.status === 'error' || upload.status === 'failed') ? "bg-destructive" : "bg-primary"
                      )}
                      style={{ width: `${Math.max(0, Math.min(100, upload.progress || 0))}%` }}
                    />
                  </div>
                </div>}
                
                {(upload.error || upload.recoveryMessage || upload.status === 'restoring') && (
                  <div className="mt-3 space-y-2">
                    {upload.recoveryMessage && <p className="rounded-kws-control bg-secondary p-3 text-sm text-muted-foreground">{upload.recoveryMessage}</p>}
                    {upload.error && <p className="break-words text-xs text-destructive">{upload.error}</p>}
                    {(upload.status === 'restoring' || upload.status === 'error' || upload.status === 'failed') && (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={(el) => { fileInputRefs.current[upload.sessionId] = el; }}
                          accept={upload.type === 'video' ? 'video/*' : 'image/*'}
                          className="hidden"
                          onChange={(e) => handleFileSelect(upload.sessionId, e)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerFileSelect(upload.sessionId)}
                          className="min-h-11 flex-1 text-sm"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Datei neu wählen
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-border p-4 md:px-5">
          <Button variant="secondary" className="w-full" onClick={retryRecovery} disabled={!retryRecovery || recoveryStatus === 'checking'}>
            <RefreshCw className={cn('mr-2 h-4 w-4', recoveryStatus === 'checking' && 'animate-spin motion-reduce:animate-none')} />
            {recoveryStatus === 'checking' ? 'Wird geprüft …' : 'Status erneut prüfen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

