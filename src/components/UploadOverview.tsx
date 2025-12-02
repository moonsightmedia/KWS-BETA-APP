import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, CheckCircle2, AlertCircle, Loader2, Minimize2, FileVideo, Image as ImageIcon, CloudUpload, RefreshCw, X, Trash2 } from 'lucide-react';
import { useUpload } from '@/contexts/UploadContext';
import { cn } from '@/lib/utils';

import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export const UploadOverview = () => {
  const { uploads, isUploading, resumeUpload, cancelUpload, removeUpload } = useUpload();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isSetterArea = location.pathname.startsWith('/setter');
  
  if (!isSetterArea) return null;

  const activeUploads = uploads;
  const hasActiveUploads = activeUploads.length > 0;

  // Always show the component in setter area, but only show button if there are uploads or dialog is open
  // This ensures the button is visible even after refresh if there are uploads in DB

  // Calculate total progress
  const totalProgress = hasActiveUploads 
    ? activeUploads.reduce((acc, curr) => acc + (curr.progress || 0), 0) / activeUploads.length 
    : 0;
  const uploadingCount = activeUploads.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const errorCount = activeUploads.filter(u => u.status === 'error').length;
  const restoringCount = activeUploads.filter(u => u.status === 'restoring').length;

  const handleFileSelect = async (sessionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      await resumeUpload(sessionId, file);
      toast.success('Datei ausgewählt. Upload wird fortgesetzt...');
    } catch (error: any) {
      toast.error('Fehler beim Fortsetzen: ' + error.message);
    }
    
    // Reset input
    if (fileInputRefs.current[sessionId]) {
      fileInputRefs.current[sessionId]!.value = '';
    }
  };

  const triggerFileSelect = (sessionId: string) => {
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className={cn(
            "fixed bottom-32 left-4 md:bottom-8 md:left-8 z-50 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-3 border-2 border-white/20",
            hasActiveUploads && (uploadingCount > 0 || restoringCount > 0 || errorCount > 0) ? "px-4 h-14" : "p-3 h-14 w-14",
            "bg-[#2E432D] text-white hover:bg-[#2E432D]/90",
            errorCount > 0 && "bg-destructive hover:bg-destructive/90 border-destructive-foreground/20"
          )}
        >
          {errorCount > 0 ? (
            <div className="relative">
                <AlertCircle className="w-6 h-6 animate-pulse text-white" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-[#2E432D]" />
            </div>
          ) : (
            <div className="relative">
                <Upload className={cn("w-6 h-6 text-white/90", uploadingCount > 0 && "animate-bounce")} />
                {uploadingCount > 0 && <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-ping" />}
            </div>
          )}
          {hasActiveUploads && (uploadingCount > 0 || restoringCount > 0 || errorCount > 0) && (
            <div className="flex flex-col items-start text-sm">
              <span className="font-bold tracking-tight">
                  {uploadingCount + restoringCount + errorCount} Upload{(uploadingCount + restoringCount + errorCount) !== 1 ? 's' : ''} {uploadingCount > 0 ? 'aktiv' : 'wartend'}
              </span>
              {uploadingCount > 0 && (
                <span className="text-white/80 text-xs font-medium">{totalProgress.toFixed(0)}% abgeschlossen</span>
              )}
            </div>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] w-[95vw] bottom-4 right-4 translate-y-0 top-auto left-auto translate-x-0 data-[state=open]:slide-in-from-bottom-10 p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-xl">
        <div className="bg-[#2E432D] p-4 text-white flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-6 h-6 text-green-400" />
            <DialogTitle className="text-lg font-bold">Upload Zentrale</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full">
            <Minimize2 className="w-6 h-6" />
          </Button>
        </div>
        
        <ScrollArea className="h-[400px] bg-background/95 backdrop-blur-sm">
          <div className="p-4 space-y-3">
            {activeUploads.length === 0 && (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                    <CheckCircle2 className="w-12 h-12 mb-2 text-green-500/20" />
                    <p>Alle Uploads abgeschlossen</p>
                </div>
            )}
            {activeUploads.map((upload) => (
              <div key={upload.sessionId} className={cn(
                  "p-4 rounded-xl border transition-all",
                  upload.status === 'error' ? "bg-red-50/50 border-red-100" : "bg-card border-border/50 shadow-sm"
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                        "p-2 rounded-lg flex-shrink-0",
                        upload.type === 'video' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    )}>
                        {upload.type === 'video' ? <FileVideo className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm truncate max-w-[180px] sm:max-w-[250px]" title={upload.fileName}>
                            {upload.fileName}
                        </h4>
                        <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            {upload.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {upload.status === 'restoring' && <RefreshCw className="w-3 h-3" />}
                            {upload.status === 'error' && <AlertCircle className="w-3 h-3" />}
                            {upload.status === 'cancelled' && <X className="w-3 h-3" />}
                            {upload.status === 'restoring' ? 'Wartet auf Datei' : 
                             upload.status === 'cancelled' ? 'Abgebrochen' : upload.status}
                        </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {upload.status === 'completed' && <div className="bg-green-100 text-green-700 p-1 rounded-xl"><CheckCircle2 className="w-6 h-6" /></div>}
                    {upload.status === 'error' && <div className="bg-red-100 text-red-700 p-1 rounded-xl"><AlertCircle className="w-6 h-6" /></div>}
                    
                    {(upload.status === 'uploading' || upload.status === 'pending') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(upload.sessionId)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Upload abbrechen"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                    
                    {(upload.status === 'error' || upload.status === 'restoring' || upload.status === 'completed' || upload.status === 'cancelled') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(upload.sessionId)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Upload entfernen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Fortschritt</span>
                    <span className={cn(
                        upload.status === 'completed' ? "text-green-600" : "text-primary"
                    )}>{upload.progress?.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500 ease-out rounded-full relative overflow-hidden",
                        upload.status === 'completed' ? "bg-green-500" :
                        upload.status === 'error' ? "bg-red-500" :
                        "bg-[#2E432D]"
                      )}
                      style={{ width: `${upload.progress || 0}%` }}
                    >
                        {upload.status === 'uploading' && (
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12" />
                        )}
                    </div>
                  </div>
                </div>
                
                {upload.error && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex gap-2 items-start">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>{upload.error}</p>
                    </div>
                    {(upload.status === 'restoring' || upload.status === 'error') && (
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
                          className="flex-1 text-xs"
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

