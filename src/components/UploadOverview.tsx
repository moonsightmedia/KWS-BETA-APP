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

  const isSetterCreate = location.pathname === '/setter/create';

  if (!isSetterCreate) return null;

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
            "fixed left-4 md:left-auto md:right-8 md:bottom-8 z-50 rounded-2xl shadow-[0_14px_36px_rgba(19,17,43,0.10)] transition-all duration-300 flex items-center justify-center gap-3 border border-[#DDE7DF]",
            hasActiveUploads && (uploadingCount > 0 || restoringCount > 0 || errorCount > 0) ? "px-4 h-14 max-w-[calc(100vw-12rem)] md:max-w-none" : "h-14 w-14 p-0",
            "bg-white text-[#13112B] hover:bg-[#F7FAF7]",
            errorCount > 0 && "border-[#E7B7B0] bg-[#FFF4F2] text-[#B64332] hover:bg-[#FFF0ED]"
          )}
          style={{ bottom: 'calc(104px + env(safe-area-inset-bottom, 0px))' }}
        >
          {errorCount > 0 ? (
            <div className="relative">
                <AlertCircle className="w-6 h-6 animate-pulse text-[#B64332]" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-[#E55A4E]" />
            </div>
          ) : (
            <div className="relative">
                <Upload className={cn("w-6 h-6 text-[#69B545]", uploadingCount > 0 && "animate-bounce")} />
                {uploadingCount > 0 && <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-[#69B545] animate-ping" />}
            </div>
          )}
          {hasActiveUploads && (uploadingCount > 0 || restoringCount > 0 || errorCount > 0) && (
            <div className="flex flex-col items-start text-sm">
              <span className="font-bold tracking-tight">
                  {uploadingCount + restoringCount + errorCount} Upload{(uploadingCount + restoringCount + errorCount) !== 1 ? 's' : ''} {uploadingCount > 0 ? 'aktiv' : 'wartend'}
              </span>
              {uploadingCount > 0 && (
                <span className="text-[#13112B]/58 text-xs font-medium">{totalProgress.toFixed(0)}% abgeschlossen</span>
              )}
            </div>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] w-full bottom-4 right-0 left-0 translate-y-0 top-auto translate-x-0 data-[state=open]:slide-in-from-bottom-10 p-0 gap-0 overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white shadow-[0_18px_45px_rgba(19,17,43,0.12)] sm:left-auto sm:right-4 sm:w-[95vw]">
        <div className="flex flex-row items-center justify-between border-b border-[#E7F0E8] bg-white p-4 text-[#13112B]">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-6 h-6 text-[#69B545]" />
            <DialogTitle className="text-lg font-bold">Upload Zentrale</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-xl text-[#13112B]/62 hover:bg-[#F7FAF7] hover:text-[#13112B]">
            <Minimize2 className="w-6 h-6" />
          </Button>
        </div>
        
        <ScrollArea className="h-[400px] bg-white">
          <div className="p-4 space-y-3">
            {activeUploads.length === 0 && (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                    <CheckCircle2 className="w-12 h-12 mb-2 text-green-500/20" />
                    <p>Alle Uploads abgeschlossen</p>
                </div>
            )}
            {activeUploads.map((upload) => (
              <div key={upload.sessionId} className={cn(
                  "p-4 rounded-2xl border transition-all",
                  upload.status === 'error' ? "border-[#E7B7B0] bg-[#FFF4F2]" : "border-[#DDE7DF] bg-[#FCFDFC]"
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                        "p-2 rounded-xl flex-shrink-0",
                        upload.type === 'video' ? "bg-[#EEF3FF] text-[#4062D8]" : "bg-[#F3F6EF] text-[#69B545]"
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
                    {upload.status === 'completed' && <div className="rounded-xl bg-[#EEF6E1] p-1 text-[#4E8A31]"><CheckCircle2 className="w-6 h-6" /></div>}
                    {upload.status === 'error' && <div className="rounded-xl bg-[#FFF4F2] p-1 text-[#B64332]"><AlertCircle className="w-6 h-6" /></div>}
                    
                    {(upload.status === 'uploading' || upload.status === 'pending') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(upload.sessionId)}
                        className="h-8 w-8 rounded-xl p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                        upload.status === 'completed' ? "text-[#4E8A31]" : "text-[#13112B]"
                    )}>{upload.progress?.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-xl bg-[#EEF1EE]">
                    <div 
                      className={cn(
                        "relative h-full overflow-hidden rounded-xl transition-all duration-500 ease-out",
                        upload.status === 'completed' ? "bg-[#69B545]" :
                        upload.status === 'error' ? "bg-[#E55A4E]" :
                        "bg-[#13112B]"
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
                    <div className="flex items-start gap-2 rounded-xl border border-[#E7B7B0] bg-[#FFF4F2] p-2 text-xs text-red-600">
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
                          className="h-10 flex-1 rounded-xl border-[#DDE7DF] text-xs"
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

