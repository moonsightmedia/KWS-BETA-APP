import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Trash2, Upload, X, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { useCreateBoulder, useUpdateBoulder } from '@/hooks/useBoulders';
import { uploadBetaVideo, uploadThumbnail } from '@/integrations/supabase/storage';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { generateBoulderName } from '@/utils/nameGenerator';

interface BoulderDraft {
  id: string;
  name: string;
  sector_id: string;
  sector_id_2: string | null;
  spansMultipleSectors: boolean;
  difficulty: number | null;
  color: string;
  note: string;
  videoFile: File | null;
  videoUrl: string;
  thumbnailFile: File | null;
  status: 'draft' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  boulderId?: string;
}

const DIFFICULTIES = [null, 1, 2, 3, 4, 5, 6, 7, 8];

export const BatchUpload = () => {
  const navigate = useNavigate();
  const { data: sectors } = useSectorsTransformed();
  const { data: colorsDb } = useColors();
  const createBoulder = useCreateBoulder();
  const updateBoulder = useUpdateBoulder();

  const [boulders, setBoulders] = useState<BoulderDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number | null>(null);

  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const thumbnailInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const COLORS = colorsDb?.map(c => c.name) || ['Grün', 'Gelb', 'Blau', 'Orange', 'Rot', 'Schwarz', 'Weiß', 'Lila'];

  const addBoulder = () => {
    const newBoulder: BoulderDraft = {
      id: `boulder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: '',
      sector_id: sectors && sectors.length > 0 ? sectors[0].id : '',
      sector_id_2: null,
      spansMultipleSectors: false,
      difficulty: 1,
      color: COLORS[0] || 'Grün',
      note: '',
      videoFile: null,
      videoUrl: '',
      thumbnailFile: null,
      status: 'draft',
      progress: 0,
    };
    setBoulders([...boulders, newBoulder]);
    console.log('[BatchUpload] Added new boulder:', newBoulder);
  };

  const removeBoulder = (id: string) => {
    setBoulders(boulders.filter(b => b.id !== id));
    delete videoInputRefs.current[id];
    delete thumbnailInputRefs.current[id];
  };

  const updateBoulderField = (id: string, field: keyof BoulderDraft, value: any) => {
    setBoulders(prevBoulders => {
      const updated = prevBoulders.map(b => 
        b.id === id ? { ...b, [field]: value } : b
      );
      console.log(`[BatchUpload] Updated boulder ${id} field ${field}:`, value, 'New state:', updated.find(b => b.id === id));
      return updated;
    });
  };

  const handleVideoFileChange = (id: string, file: File | null) => {
    updateBoulderField(id, 'videoFile', file);
    updateBoulderField(id, 'videoUrl', ''); // Clear CDN URL if file is selected
  };

  const handleThumbnailFileChange = (id: string, file: File | null) => {
    updateBoulderField(id, 'thumbnailFile', file);
  };

  const canUpload = useMemo(() => {
    if (boulders.length === 0) {
      console.log('[BatchUpload] canUpload: false - no boulders');
      return false;
    }
    
    const invalidBoulders = boulders.filter(b => {
      const hasName = !!b.name && b.name.trim().length > 0;
      const hasSector = !!b.sector_id && b.sector_id.trim().length > 0;
      const hasValidDifficulty = b.difficulty === null || (b.difficulty >= 1 && b.difficulty <= 8);
      const hasVideo = !!(b.videoFile || (b.videoUrl && typeof b.videoUrl === 'string' && b.videoUrl.trim().length > 0));
      
      const isValid = hasName && hasSector && hasValidDifficulty && hasVideo;
      
      if (!isValid) {
        console.log('[BatchUpload] Invalid boulder:', {
          id: b.id,
          hasName,
          hasSector,
          hasValidDifficulty,
          hasVideo,
          name: b.name,
          sector_id: b.sector_id,
          difficulty: b.difficulty,
          videoFile: !!b.videoFile,
          videoUrl: b.videoUrl,
        });
      }
      
      return !isValid;
    });
    
    if (invalidBoulders.length > 0) {
      console.log(`[BatchUpload] canUpload: false - ${invalidBoulders.length} invalid boulder(s)`);
      return false;
    }
    
    console.log('[BatchUpload] canUpload: true - all boulders valid');
    return true;
  }, [boulders]);

  const uploadAllBoulders = async () => {
    if (!canUpload || isUploading) return;

    setIsUploading(true);
    setCurrentUploadIndex(0);

    for (let i = 0; i < boulders.length; i++) {
      const boulder = boulders[i];
      setCurrentUploadIndex(i);
      
      try {
        // Update status to uploading
        updateBoulderField(boulder.id, 'status', 'uploading');
        updateBoulderField(boulder.id, 'progress', 0);

        // Create boulder in database
        const boulderData = {
          name: boulder.name,
          sector_id: boulder.sector_id,
          sector_id_2: boulder.spansMultipleSectors && boulder.sector_id_2 ? boulder.sector_id_2 : null,
          difficulty: boulder.difficulty,
          color: boulder.color,
          beta_video_url: boulder.videoUrl || null, // Use CDN URL if provided
          thumbnail_url: null, // Will be updated after upload
          note: boulder.note,
        };

        const createdBoulder = await createBoulder.mutateAsync(boulderData as any);
        if (!createdBoulder?.id) {
          throw new Error('Boulder wurde erstellt, aber keine ID zurückgegeben');
        }
        updateBoulderField(boulder.id, 'boulderId', createdBoulder.id);
        updateBoulderField(boulder.id, 'progress', 20);

        // Upload video if file exists
        if (boulder.videoFile) {
          try {
            const videoUrl = await uploadBetaVideo(
              boulder.videoFile,
              (progress) => {
                // Progress: 20-70% for video upload
                const totalProgress = 20 + (progress * 0.5);
                updateBoulderField(boulder.id, 'progress', totalProgress);
              },
              createdBoulder.id
            );
            
            await updateBoulder.mutateAsync({
              id: createdBoulder.id,
              beta_video_url: videoUrl,
            } as any);
            updateBoulderField(boulder.id, 'progress', 70);
          } catch (error: any) {
            console.error(`[BatchUpload] Video upload failed for ${boulder.name}:`, error);
            updateBoulderField(boulder.id, 'error', `Video-Upload fehlgeschlagen: ${error.message}`);
            updateBoulderField(boulder.id, 'status', 'failed');
            continue; // Skip thumbnail if video failed
          }
        }

        // Upload thumbnail if file exists
        if (boulder.thumbnailFile) {
          try {
            const thumbnailUrl = await uploadThumbnail(
              boulder.thumbnailFile,
              (progress) => {
                // Progress: 70-100% for thumbnail upload
                const totalProgress = 70 + (progress * 0.3);
                updateBoulderField(boulder.id, 'progress', totalProgress);
              },
              createdBoulder.id
            );
            
            await updateBoulder.mutateAsync({
              id: createdBoulder.id,
              thumbnail_url: thumbnailUrl,
            } as any);
          } catch (error: any) {
            console.error(`[BatchUpload] Thumbnail upload failed for ${boulder.name}:`, error);
            // Don't fail the whole upload if thumbnail fails
            updateBoulderField(boulder.id, 'error', `Thumbnail-Upload fehlgeschlagen: ${error.message}`);
          }
        }

        updateBoulderField(boulder.id, 'progress', 100);
        updateBoulderField(boulder.id, 'status', 'completed');
      } catch (error: any) {
        console.error(`[BatchUpload] Failed to create/upload ${boulder.name}:`, error);
        updateBoulderField(boulder.id, 'status', 'failed');
        updateBoulderField(boulder.id, 'error', error.message || 'Unbekannter Fehler');
      }
    }

    // Show summary
    const completed = boulders.filter(b => b.status === 'completed').length;
    const failed = boulders.filter(b => b.status === 'failed').length;
    
    // Wait a moment to show final progress in dialog
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsUploading(false);
    setCurrentUploadIndex(null);
    
    if (completed > 0) {
      toast.success(`${completed} Boulder erfolgreich hochgeladen!`);
    }
    if (failed > 0) {
      toast.error(`${failed} Boulder fehlgeschlagen`);
    }

    // Navigate to boulders page after 2 seconds
    setTimeout(() => {
      navigate('/boulders');
    }, 2000);
  };

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (boulders.length === 0) return 0;
    const totalProgress = boulders.reduce((sum, b) => sum + b.progress, 0);
    return totalProgress / boulders.length;
  }, [boulders]);

  // Get current uploading boulder
  const currentBoulder = currentUploadIndex !== null ? boulders[currentUploadIndex] : null;

  // Count completed and failed
  const completedCount = boulders.filter(b => b.status === 'completed').length;
  const failedCount = boulders.filter(b => b.status === 'failed').length;
  const totalCount = boulders.length;

  return (
    <>
      {/* Upload Progress Dialog */}
      <Dialog open={isUploading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md max-w-[95vw] w-full" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {overallProgress < 100 ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Boulder werden hochgeladen...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Upload abgeschlossen!
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {currentBoulder ? (
                <>
                  Aktuell: <span className="font-semibold text-foreground">{currentBoulder.name || `Boulder ${(currentUploadIndex || 0) + 1}`}</span>
                </>
              ) : overallProgress >= 100 ? (
                'Alle Boulder wurden verarbeitet.'
              ) : (
                'Vorbereitung...'
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gesamtfortschritt</span>
                <span className="font-medium">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedCount} von {totalCount} erfolgreich</span>
                {failedCount > 0 && (
                  <span className="text-destructive">{failedCount} fehlgeschlagen</span>
                )}
              </div>
            </div>

            {/* Current Boulder Progress */}
            {currentBoulder && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aktueller Boulder</span>
                  <span className="font-medium">{Math.round(currentBoulder.progress)}%</span>
                </div>
                <Progress value={currentBoulder.progress} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {currentBoulder.status === 'uploading' && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Upload läuft...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Status Summary */}
            <div className="pt-2 border-t">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-semibold text-lg">{totalCount}</div>
                  <div className="text-muted-foreground">Gesamt</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-green-600">{completedCount}</div>
                  <div className="text-muted-foreground">Erfolgreich</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-destructive">{failedCount}</div>
                  <div className="text-muted-foreground">Fehlgeschlagen</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full min-w-0 max-w-full overflow-hidden">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="text-lg sm:text-xl">Batch-Upload</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={addBoulder}
              disabled={isUploading}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Boulder hinzufügen</span>
            </Button>
            <Button
              onClick={uploadAllBoulders}
              disabled={!canUpload || isUploading}
              className="bg-success hover:bg-success/90 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canUpload ? `Button deaktiviert: ${boulders.length === 0 ? 'Keine Boulder' : 'Nicht alle Boulder sind vollständig ausgefüllt (Name, Sektor, Video erforderlich)'}` : 'Alle Boulder hochladen'}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                  <span className="truncate">Upload läuft...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Alle hochladen ({boulders.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Erstelle mehrere Boulder und lade sie alle auf einmal hoch. Videos werden sequenziell hochgeladen.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-2 sm:px-6">
        {boulders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">Noch keine Boulder hinzugefügt</p>
            <Button onClick={addBoulder} variant="outline">
              <PlusCircle className="w-4 h-4 mr-2" />
              Ersten Boulder hinzufügen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {boulders.map((boulder, index) => (
              <Card key={boulder.id} className="border-2 w-full min-w-0 max-w-full overflow-hidden">
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate min-w-0">Boulder {index + 1}</CardTitle>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {boulder.status === 'completed' && (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Erfolgreich
                        </Badge>
                      )}
                      {boulder.status === 'failed' && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Fehlgeschlagen
                        </Badge>
                      )}
                      {boulder.status === 'uploading' && (
                        <Badge className="bg-blue-500">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Upload läuft...
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBoulder(boulder.id)}
                        disabled={isUploading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {boulder.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={boulder.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(boulder.progress)}%</p>
                    </div>
                  )}
                  {boulder.error && (
                    <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded">
                      {boulder.error}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 px-2 sm:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="w-full min-w-0">
                      <Label htmlFor={`name-${boulder.id}`}>Name *</Label>
                      <div className="flex items-center gap-1 sm:gap-2 w-full min-w-0">
                        <Input
                          id={`name-${boulder.id}`}
                          value={boulder.name}
                          onChange={(e) => updateBoulderField(boulder.id, 'name', e.target.value)}
                          disabled={isUploading}
                          placeholder="Boulder-Name"
                          className="flex-1 min-w-0 text-sm sm:text-base"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateBoulderField(boulder.id, 'name', generateBoulderName(boulder.color, boulder.difficulty))}
                          disabled={isUploading}
                          className="flex-shrink-0 h-9 sm:h-10 px-2 sm:px-3"
                        >
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="w-full min-w-0">
                      <Label htmlFor={`sector-${boulder.id}`}>Sektor *</Label>
                      <Select
                        value={boulder.sector_id}
                        onValueChange={(value) => updateBoulderField(boulder.id, 'sector_id', value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger id={`sector-${boulder.id}`} className="w-full min-w-0">
                          <SelectValue placeholder="Sektor wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full min-w-0">
                      <Label htmlFor={`difficulty-${boulder.id}`}>Schwierigkeit</Label>
                      <Select
                        value={boulder.difficulty === null ? '?' : String(boulder.difficulty)}
                        onValueChange={(value) => updateBoulderField(boulder.id, 'difficulty', value === '?' ? null : parseInt(value, 10))}
                        disabled={isUploading}
                      >
                        <SelectTrigger id={`difficulty-${boulder.id}`} className="w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTIES.map(d => (
                            <SelectItem key={d === null ? '?' : String(d)} value={d === null ? '?' : String(d)}>
                              {d === null ? '?' : String(d)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full min-w-0">
                      <Label htmlFor={`color-${boulder.id}`}>Farbe</Label>
                      <Select
                        value={boulder.color}
                        onValueChange={(value) => updateBoulderField(boulder.id, 'color', value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger id={`color-${boulder.id}`} className="w-full min-w-0">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div 
                              className="w-4 h-4 rounded-full border flex-shrink-0" 
                              style={getColorBackgroundStyle(boulder.color, colorsDb || undefined)}
                            />
                            <SelectValue className="flex-1 min-w-0" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {COLORS.map(color => {
                            const colorData = colorsDb?.find(c => c.name === color);
                            return (
                              <SelectItem key={color} value={color}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full border flex-shrink-0" 
                                    style={getColorBackgroundStyle(color, colorsDb || undefined)}
                                  />
                                  <span>{color}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <Label htmlFor={`note-${boulder.id}`}>Notiz</Label>
                    <Textarea
                      id={`note-${boulder.id}`}
                      value={boulder.note}
                      onChange={(e) => updateBoulderField(boulder.id, 'note', e.target.value)}
                      disabled={isUploading}
                      placeholder="Optionale Notiz"
                      rows={2}
                      className="w-full min-w-0 text-sm sm:text-base"
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <Label>Video *</Label>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="video/*"
                        ref={(el) => { videoInputRefs.current[boulder.id] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          console.log(`[BatchUpload] Video file selected for ${boulder.id}:`, file?.name, file?.size);
                          handleVideoFileChange(boulder.id, file);
                        }}
                        disabled={isUploading}
                        className="text-xs w-full min-w-0"
                      />
                      <Input
                        type="url"
                        placeholder="Oder CDN-URL eingeben"
                        value={boulder.videoUrl || ''}
                        onChange={(e) => {
                          const url = e.target.value;
                          console.log(`[BatchUpload] Video URL changed for ${boulder.id}:`, url);
                          updateBoulderField(boulder.id, 'videoUrl', url);
                          if (url) {
                            updateBoulderField(boulder.id, 'videoFile', null);
                            if (videoInputRefs.current[boulder.id]) {
                              videoInputRefs.current[boulder.id]!.value = '';
                            }
                          }
                        }}
                        disabled={isUploading}
                        className="text-xs w-full min-w-0"
                      />
                      {boulder.videoFile && (
                        <p className="text-xs text-green-600 truncate">
                          ✓ {boulder.videoFile.name} ({(boulder.videoFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                      {boulder.videoUrl && !boulder.videoFile && (
                        <p className="text-xs text-green-600 truncate">
                          ✓ CDN-URL: {boulder.videoUrl}
                        </p>
                      )}
                      {!boulder.videoFile && !boulder.videoUrl && (
                        <p className="text-xs text-red-500 font-medium">
                          ⚠ Video ist erforderlich (Datei oder CDN-URL)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <Label>Thumbnail (optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      ref={(el) => { thumbnailInputRefs.current[boulder.id] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleThumbnailFileChange(boulder.id, file);
                      }}
                      disabled={isUploading}
                      className="text-xs w-full min-w-0"
                    />
                    {boulder.thumbnailFile && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {boulder.thumbnailFile.name} ({(boulder.thumbnailFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};

