import React, { useState } from 'react';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, FileVideo, Image as ImageIcon, Loader2, X, Check, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useUpload } from '@/contexts/UploadContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BatchBoulder {
  id: string;
  name: string;
  sectorId: string;
  colorId: string;
  difficulty: number;
  videoFile: File | null;
  thumbFile: File | null;
  status: 'draft';
}

export const BatchUpload = () => {
  const { data: sectors } = useSectorsTransformed();
  const { data: colors } = useColors();
  const { startUpload } = useUpload();
  
  const [boulders, setBoulders] = useState<BatchBoulder[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBoulder, setCurrentBoulder] = useState<BatchBoulder>(createEmptyBoulder());
  const [isEditing, setIsEditing] = useState(false);

  function generateBoulderName(): string {
    const timestamp = new Date();
    const dateStr = timestamp.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const timeStr = timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const randomNum = Math.floor(Math.random() * 1000);
    return `Boulder ${dateStr} ${timeStr} #${randomNum}`;
  }

  function createEmptyBoulder(): BatchBoulder {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: generateBoulderName(),
      sectorId: '',
      colorId: '',
      difficulty: 4,
      videoFile: null,
      thumbFile: null,
      status: 'draft'
    };
  }

  const openAddDialog = () => {
    setCurrentBoulder(createEmptyBoulder());
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (boulder: BatchBoulder) => {
    setCurrentBoulder({ ...boulder });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const saveBoulderFromDialog = () => {
    if (!currentBoulder.name || !currentBoulder.sectorId || !currentBoulder.colorId) {
        toast.error('Bitte Name, Sektor und Farbe ausfüllen.');
        return;
    }

    if (isEditing) {
        setBoulders(boulders.map(b => b.id === currentBoulder.id ? currentBoulder : b));
        } else {
        setBoulders([currentBoulder, ...boulders]);
    }
    setIsDialogOpen(false);
  };

  const removeBoulder = (id: string) => {
    setBoulders(boulders.filter(b => b.id !== id));
  };

  const updateCurrentBoulder = (updates: Partial<BatchBoulder>) => {
    setCurrentBoulder(prev => ({ ...prev, ...updates }));
  };

  const handleFileSelect = (type: 'video' | 'thumb', file: File) => {
    if (type === 'video') {
       updateCurrentBoulder({ videoFile: file });
    } else {
       updateCurrentBoulder({ thumbFile: file });
    }
  };

  const validateBoulders = () => {
    if (boulders.length === 0) {
        toast.error('Keine Boulder zum Hochladen.');
      return false;
    }
    const valid = boulders.every(b => 
        b.name && b.sectorId && b.colorId && b.videoFile && b.thumbFile
    );
    if (!valid) {
        toast.error('Bitte für alle Boulder Video und Thumbnail hinzufügen.');
      return false;
    }
    return true;
  };

  const uploadAll = async () => {
    if (!validateBoulders()) return;

    setIsProcessing(true);
    toast.info('Bereite Uploads vor...', { duration: 1000 });
    
    const successfulIds: string[] = [];
    const bouldersToProcess = [...boulders];

    for (const boulder of bouldersToProcess) {
        try {
            const { data: dbBoulder, error: dbError } = await supabase
                .from('boulders')
                .insert({
          name: boulder.name,
                    sector_id: boulder.sectorId,
                    color: colors?.find(c => c.id === boulder.colorId)?.name || 'Unbekannt',
          difficulty: boulder.difficulty,
                    status: 'haengt' 
                })
                .select()
                .single();

            if (dbError || !dbBoulder) throw new Error('DB Error: ' + (dbError?.message || 'Unknown'));

            if (boulder.thumbFile) {
                startUpload(dbBoulder.id, boulder.thumbFile, 'thumbnail', boulder.sectorId);
            }
            
        if (boulder.videoFile) {
                startUpload(dbBoulder.id, boulder.videoFile, 'video', boulder.sectorId);
            }

            successfulIds.push(boulder.id);

            } catch (error: any) {
            console.error('Failed to queue boulder:', boulder.name, error);
            toast.error(`Fehler bei "${boulder.name}": ${error.message}`);
        }
    }
    
    setBoulders(prev => prev.filter(b => !successfulIds.includes(b.id)));
    
    if (successfulIds.length > 0) {
        toast.success(`${successfulIds.length} Boulder in die Upload-Warteschlange gestellt.`);
    }

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 pb-48 relative min-h-[calc(100vh-200px)]">
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] sm:!max-w-[500px] max-h-[85vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Boulder bearbeiten' : 'Neuer Boulder'}</DialogTitle>
            <DialogDescription>
                Erstelle einen neuen Boulder. Lade Video und Thumbnail hoch.
            </DialogDescription>
          </DialogHeader>
          
            <div className="grid gap-4 py-2 sm:py-4 w-full box-border">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full box-border">
                    <div className="relative w-full aspect-[9/16] max-h-[200px] bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 transition-all overflow-hidden group cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 appearance-none text-[0]"
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleFileSelect('thumb', e.target.files[0]);
                            }}
                        />
                        {currentBoulder.thumbFile ? (
                            <>
                                <img 
                                    src={URL.createObjectURL(currentBoulder.thumbFile)} 
                                    alt="Thumbnail" 
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 z-10">
                                    <Check className="w-3 h-3 text-white" />
              </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                                <ImageIcon className="w-6 h-6 text-muted-foreground mb-2" />
                                <span className="text-xs text-muted-foreground">Thumbnail</span>
                            </div>
                        )}
            </div>

                    <div className="relative w-full aspect-[9/16] max-h-[200px] bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 transition-all overflow-hidden group cursor-pointer">
                        <input
                            type="file"
                            accept="video/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 appearance-none text-[0]"
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleFileSelect('video', e.target.files[0]);
                            }}
                        />
                        {currentBoulder.videoFile ? (
                            <>
                                <div className="absolute inset-0 w-full h-full bg-black/5 flex flex-col items-center justify-center p-2 text-center">
                                    <FileVideo className="w-8 h-8 text-primary mb-2" />
                                    <span className="text-[10px] text-muted-foreground truncate w-full px-1">{currentBoulder.videoFile.name}</span>
                      </div>
                                <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 z-10">
                                    <Check className="w-3 h-3 text-white" />
                        </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                                <FileVideo className="w-6 h-6 text-muted-foreground mb-2" />
                                <span className="text-xs text-muted-foreground">Video</span>
                    </div>
                  )}
                    </div>
                </div>

                <div className="space-y-4 w-full box-border">
                    <div className="space-y-2 w-full box-border">
                        <Label>Name</Label>
                        <div className="flex gap-2 w-full box-border">
                            <Input 
                                value={currentBoulder.name} 
                                onChange={(e) => updateCurrentBoulder({ name: e.target.value })} 
                                placeholder="Boulder Name"
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => updateCurrentBoulder({ name: generateBoulderName() })}
                                title="Neuen Namen generieren"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-4 w-full box-border">
                        <div className="space-y-2 w-full box-border">
                            <Label>Sektor</Label>
                            <div className="w-full overflow-x-auto overflow-y-hidden pb-2 box-border -mx-1 px-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.1) transparent' }}>
                                <div className="flex gap-2 min-w-max">
                                    {sectors?.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => updateCurrentBoulder({ sectorId: s.id })}
                                            className={cn(
                                                "flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all border whitespace-nowrap",
                                                currentBoulder.sectorId === s.id
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 w-full box-border">
                            <Label>Farbe</Label>
                            <div className="w-full overflow-x-auto overflow-y-hidden pb-2 box-border -mx-1 px-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.1) transparent' }}>
                                <div className="flex gap-2 min-w-max">
                                    {colors?.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => updateCurrentBoulder({ colorId: c.id })}
                                            className={cn(
                                                "flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all border whitespace-nowrap flex items-center gap-2",
                                                currentBoulder.colorId === c.id
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.hex }} />
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 w-full box-border">
                        <Label className="text-sm font-medium">Schwierigkeit: {currentBoulder.difficulty}</Label>
                        <div className="grid grid-cols-8 gap-1 w-full">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => updateCurrentBoulder({ difficulty: level })}
                                    className={cn(
                                        "w-full aspect-square rounded-md flex items-center justify-center text-xs sm:text-sm font-bold transition-all border min-w-0",
                                        currentBoulder.difficulty === level 
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                            : "bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                  </div>
          </div>

            <DialogFooter className="gap-3 sm:gap-3">
              <Button
                variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 h-12 text-base font-medium"
              >
                    Abbrechen
              </Button>
              <Button
                    onClick={saveBoulderFromDialog} 
                    className="flex-1 h-12 text-base font-medium bg-primary text-primary-foreground"
                >
                    {isEditing ? 'Speichern' : 'Hinzufügen'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Floating Actions */}
      <div className="fixed bottom-32 right-4 z-40 md:hidden flex items-end gap-3">
              <Button
            onClick={uploadAll} 
            size="icon" 
            disabled={isProcessing || boulders.length === 0}
            className="h-14 w-14 rounded-full shadow-xl bg-[#2E432D] hover:bg-[#2E432D]/90 transition-all hover:scale-105 disabled:opacity-50 disabled:grayscale"
        >
            {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudUpload className="h-8 w-8" />}
              </Button>
            <Button
            onClick={openAddDialog} 
            size="icon" 
            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-all hover:scale-105"
        >
            <Plus className="h-8 w-8 text-white" />
            </Button>
          </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Batch Upload</h2>
        <div className="flex gap-2">
            <Button onClick={uploadAll} disabled={isProcessing || boulders.length === 0} className="bg-[#2E432D] hover:bg-[#2E432D]/90 text-white">
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
                Alle hochladen ({boulders.length})
              </Button>
            <Button onClick={openAddDialog} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Boulder hinzufügen
                      </Button>
                    </div>
                  </div>

      {/* List */}
      <div className="grid gap-3 max-w-2xl mx-auto">
        {boulders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <p>Noch keine Boulder hinzugefügt.</p>
                <Button variant="link" onClick={openAddDialog}>Jetzt hinzufügen</Button>
                    </div>
                  )}
        {boulders.map((boulder) => (
          <div key={boulder.id} className="group relative flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="relative h-24 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted cursor-pointer border shadow-sm" onClick={() => openEditDialog(boulder)}>
                {boulder.thumbFile ? (
                    <img src={URL.createObjectURL(boulder.thumbFile)} alt={boulder.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground/50" /></div>
                      )}
                    </div>
            <div className="flex-1 min-w-0 cursor-pointer px-1" onClick={() => openEditDialog(boulder)}>
                <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-bold text-base truncate">{boulder.name || 'Unbenannt'}</h3>
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex-shrink-0">{boulder.difficulty}</span>
                  </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[100px]">{sectors?.find(s => s.id === boulder.sectorId)?.name || 'Sektor?'}</span>
                    <span>•</span>
                    <span>{colors?.find(c => c.id === boulder.colorId)?.name || 'Farbe?'}</span>
                    </div>
                  </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => removeBoulder(boulder.id)} disabled={isProcessing}>
                <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
        ))}
                    </div>
                      </div>
  );
};
