import React, { useState } from 'react';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Upload, FileVideo, Image as ImageIcon, Loader2, X, Check, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useUpload } from '@/contexts/UploadContext';
import { generateBoulderName } from '@/utils/nameGenerator';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { sendPushNotificationForNotification } from '@/services/pushNotifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BatchBoulder {
  id: string;
  name: string;
  sectorId: string;
  sectorId2?: string;
  spansMultipleSectors?: boolean;
  colorId: string;
  difficulty: number | null;
  videoFile: File | null;
  thumbFile: File | null;
  status: 'draft';
}

export const BatchUpload = () => {
  const { data: sectors } = useSectorsTransformed();
  const { data: colors } = useColors();
  const { session } = useAuth();
  const { startUpload } = useUpload();
  
  const [boulders, setBoulders] = useState<BatchBoulder[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBoulder, setCurrentBoulder] = useState<BatchBoulder>(createEmptyBoulder());
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to adjust name when color changes
  const adjustNameForColor = (colorId: string): string => {
    const color = colors?.find(c => c.id === colorId);
    if (!color) return currentBoulder.name;
    // Generate new name with current color and difficulty
    return generateBoulderName(color.name, currentBoulder.difficulty);
  };

  function createEmptyBoulder(): BatchBoulder {
    const defaultColor = colors?.[0];
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: defaultColor ? generateBoulderName(defaultColor.name, 4) : 'Neuer Boulder',
      sectorId: '',
      colorId: defaultColor?.id || '',
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
    const successfulBoulderIds: string[] = []; // Database IDs of successfully created boulders
    const failedBoulders: Array<{ name: string; error: string }> = [];
    const bouldersToProcess = [...boulders];

    // Process boulders sequentially to avoid overwhelming the system
    if (!session) {
        toast.error('Nicht angemeldet. Bitte melde dich an.');
        setIsProcessing(false);
        return;
    }

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        toast.error('Supabase-Konfiguration fehlt');
        setIsProcessing(false);
        return;
    }

    for (const boulder of bouldersToProcess) {
        try {
            // Create boulder in database first using direct fetch
            const insertData: any = {
                name: boulder.name,
                sector_id: boulder.sectorId,
                color: colors?.find(c => c.id === boulder.colorId)?.name || 'Unbekannt',
                difficulty: boulder.difficulty,
                status: 'haengt'
            };
            
            // Add second sector if specified
            if (boulder.spansMultipleSectors && boulder.sectorId2) {
                insertData.sector_id_2 = boulder.sectorId2;
            }
            
            console.log('[BatchUpload] 🔵 Creating boulder:', insertData.name);
            
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/boulders`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(insertData),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const dbBoulder = Array.isArray(data) ? data[0] : data;

            if (!dbBoulder) {
                throw new Error('Boulder wurde nicht erstellt');
            }
            
            console.log('[BatchUpload] ✅ Boulder created:', dbBoulder.id);
            successfulBoulderIds.push(dbBoulder.id);

            // Start uploads (they will be queued by UploadContext)
            // Add small delay between boulders to avoid overwhelming the system
            if (boulder.thumbFile) {
                console.log('[BatchUpload] 🚀 Starting thumbnail upload for boulder:', dbBoulder.id, 'file:', boulder.thumbFile.name, 'size:', boulder.thumbFile.size);
                try {
                    const sessionId = await startUpload(dbBoulder.id, boulder.thumbFile, 'thumbnail', boulder.sectorId);
                    console.log('[BatchUpload] ✅ Thumbnail upload started, sessionId:', sessionId);
                } catch (error) {
                    console.error('[BatchUpload] ❌ Error starting thumbnail upload:', error);
                }
                // Small delay to prevent too many simultaneous uploads
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.warn('[BatchUpload] ⚠️ No thumbnail file for boulder:', dbBoulder.id);
            }
            
            if (boulder.videoFile) {
                console.log('[BatchUpload] 🚀 Starting video upload for boulder:', dbBoulder.id, 'file:', boulder.videoFile.name, 'size:', boulder.videoFile.size);
                try {
                    const sessionId = await startUpload(dbBoulder.id, boulder.videoFile, 'video', boulder.sectorId);
                    console.log('[BatchUpload] ✅ Video upload started, sessionId:', sessionId);
                } catch (error) {
                    console.error('[BatchUpload] ❌ Error starting video upload:', error);
                }
                // Small delay to prevent too many simultaneous uploads
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.warn('[BatchUpload] ⚠️ No video file for boulder:', dbBoulder.id);
            }

            successfulIds.push(boulder.id);

        } catch (error: any) {
            console.error('Failed to queue boulder:', boulder.name, error);
            failedBoulders.push({ name: boulder.name, error: error.message });
            toast.error(`Fehler bei "${boulder.name}": ${error.message}`);
        }
    }
    
    // Remove successfully queued boulders from the list
    setBoulders(prev => prev.filter(b => !successfulIds.includes(b.id)));
    
    // Show summary
    if (successfulIds.length > 0) {
        const totalFiles = successfulIds.length * 2; // Each boulder has video + thumbnail
        toast.success(`${successfulIds.length} Boulder (${totalFiles} Dateien) in die Upload-Warteschlange gestellt.`, { duration: 3000 });
        
        // CRITICAL: Create batch notification manually after all boulders are created
        // This is much more reliable than relying on trigger timing
        if (successfulBoulderIds.length > 0) {
          try {
            console.log(`[BatchUpload] 🔔 Creating batch notification for ${successfulBoulderIds.length} boulders...`);
            
            // Get all users who have boulder_new enabled
            const usersResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/notification_preferences?boulder_new=eq.true&select=user_id`,
              {
                method: 'GET',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            if (usersResponse.ok) {
              const users = await usersResponse.json();
              console.log(`[BatchUpload] Found ${users.length} users with boulder_new enabled`);
              
              // Get boulder details for the notification message
              const bouldersResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/boulders?id=in.(${successfulBoulderIds.join(',')})&select=id,name,sector_id`,
                {
                  method: 'GET',
                  headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              let boulderDetails: any[] = [];
              if (bouldersResponse.ok) {
                boulderDetails = await bouldersResponse.json();
              }
              
              // Get unique sector IDs
              const sectorIds = [...new Set(boulderDetails.map((b: any) => b.sector_id).filter(Boolean))];
              
              // Create notification for each user
              const notificationPromises = users.map(async (user: { user_id: string }) => {
                try {
                  // Determine message based on count
                  const message = successfulBoulderIds.length === 1
                    ? `Ein neuer Boulder wurde hinzugefügt: ${boulderDetails[0]?.name || 'Unbenannt'}`
                    : `${successfulBoulderIds.length} neue Boulder wurden hinzugefügt`;
                  
                  // Call create_notification RPC function
                  const createNotificationResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/rpc/create_notification`,
                    {
                      method: 'POST',
                      headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        p_user_id: user.user_id,
                        p_type: 'boulder_new',
                        p_title: 'Neuer Boulder verfügbar',
                        p_message: message,
                        p_data: {
                          boulder_count: successfulBoulderIds.length,
                          boulder_ids: successfulBoulderIds,
                          sector_ids: sectorIds,
                          latest_boulder_id: successfulBoulderIds[successfulBoulderIds.length - 1],
                          latest_sector_id: sectorIds[0] || null,
                        },
                        p_action_url: '/boulders',
                      }),
                    }
                  );
                  
                  if (createNotificationResponse.ok) {
                    const notificationId = await createNotificationResponse.json();
                    console.log(`[BatchUpload] ✅ Created notification ${notificationId} for user ${user.user_id}`);
                    
                    // Send push notification for this notification
                    if (notificationId) {
                      await sendPushNotificationForNotification(notificationId, session);
                      console.log(`[BatchUpload] ✅ Sent push notification for notification ${notificationId}`);
                    }
                    
                    return notificationId;
                  } else {
                    const errorText = await createNotificationResponse.text();
                    console.error(`[BatchUpload] ❌ Error creating notification for user ${user.user_id}:`, errorText);
                    return null;
                  }
                } catch (error) {
                  console.error(`[BatchUpload] ❌ Error creating notification for user ${user.user_id}:`, error);
                  return null;
                }
              });
              
              await Promise.all(notificationPromises);
              console.log(`[BatchUpload] ✅ Batch notifications created and push notifications sent for ${successfulBoulderIds.length} boulders`);
            } else {
              const errorText = await usersResponse.text();
              console.error('[BatchUpload] ❌ Error fetching users with boulder_new enabled:', errorText);
            }
          } catch (error) {
            console.error('[BatchUpload] ❌ Error creating batch notifications:', error);
            // Don't show error to user - notifications are optional
          }
        }
    }
    
    if (failedBoulders.length > 0) {
        toast.error(`${failedBoulders.length} Boulder konnten nicht hinzugefügt werden.`, { duration: 3000 });
    }

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 pb-48 relative min-h-[calc(100vh-200px)]">
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-0 gap-0 w-full">
          <div className="sticky top-0 z-10 bg-white border-b border-[#E7F7E9] px-4 sm:px-6 py-4 rounded-t-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold text-[#13112B]">{isEditing ? 'Boulder bearbeiten' : 'Neuer Boulder'}</DialogTitle>
              <DialogDescription className="text-sm text-[#13112B]/60">
                Erstelle einen neuen Boulder. Lade Video und Thumbnail hoch.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-4 sm:px-6 py-4 space-y-5">
          
            <div className="grid gap-3 py-2 sm:py-3 w-full box-border min-w-0">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full box-border min-w-0">
                    <div className="relative w-full aspect-[9/16] max-h-[160px] bg-[#F9FAF9] rounded-xl border-2 border-dashed border-[#E7F7E9] hover:border-[#36B531]/50 hover:bg-[#E7F7E9]/50 transition-all overflow-hidden group cursor-pointer">
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
                                <div className="absolute top-2 right-2 bg-[#36B531] rounded-xl p-1 z-10">
                                    <Check className="w-3 h-3 text-white" />
              </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                                <ImageIcon className="w-6 h-6 text-[#13112B]/40 mb-1" />
                                <span className="text-[10px] text-[#13112B]/60">Thumbnail</span>
                            </div>
                        )}
            </div>

                    <div className="relative w-full aspect-[9/16] max-h-[160px] bg-[#F9FAF9] rounded-xl border-2 border-dashed border-[#E7F7E9] hover:border-[#36B531]/50 hover:bg-[#E7F7E9]/50 transition-all overflow-hidden group cursor-pointer">
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
                                    <FileVideo className="w-6 h-6 text-[#36B531] mb-1" />
                                    <span className="text-[10px] text-[#13112B]/60 truncate w-full px-1">{currentBoulder.videoFile.name}</span>
                      </div>
                                <div className="absolute top-2 right-2 bg-[#36B531] rounded-xl p-1 z-10">
                                    <Check className="w-3 h-3 text-white" />
                        </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                                <FileVideo className="w-6 h-6 text-[#13112B]/40 mb-1" />
                                <span className="text-[10px] text-[#13112B]/60">Video</span>
                    </div>
                  )}
                    </div>
                </div>

                <div className="space-y-5 w-full box-border min-w-0">
                    <div className="space-y-2 w-full box-border min-w-0">
                        <Label className="text-sm font-medium text-[#13112B]">Name</Label>
                        <div className="flex gap-2 w-full box-border min-w-0">
                            <Input 
                                value={currentBoulder.name} 
                                onChange={(e) => updateCurrentBoulder({ name: e.target.value })} 
                                placeholder="Boulder Name"
                                className="flex-1 min-w-0 h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    const color = colors?.find(c => c.id === currentBoulder.colorId);
                                    const newName = color 
                                        ? generateBoulderName(color.name, currentBoulder.difficulty)
                                        : generateBoulderName('Grün', currentBoulder.difficulty);
                                    updateCurrentBoulder({ name: newName });
                                }}
                                title="Neuen Namen generieren"
                                className="h-11 w-11 border-[#E7F7E9] hover:bg-[#E7F7E9] hover:text-[#13112B]"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                        <div className="space-y-5 w-full box-border">
                        <div className="space-y-2 w-full box-border min-w-0">
                            <Label className="text-sm font-medium text-[#13112B]">Sektor</Label>
                            <div className="w-full overflow-x-auto overflow-y-hidden pb-2 box-border -mx-1 px-1 scrollbar-hide touch-pan-x">
                                <div className="flex gap-2 min-w-max">
                                    {sectors?.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => updateCurrentBoulder({ sectorId: s.id })}
                                            className={cn(
                                                "flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap h-11",
                                                currentBoulder.sectorId === s.id
                                                    ? "bg-[#36B531] text-white border-[#36B531] shadow-sm"
                                                    : "bg-white text-[#13112B] border-[#E7F7E9] hover:bg-[#E7F7E9] hover:text-[#13112B]"
                                            )}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="spans-multiple-sectors-batch"
                            checked={currentBoulder.spansMultipleSectors || false}
                            onCheckedChange={(checked) => updateCurrentBoulder({ 
                              spansMultipleSectors: checked === true, 
                              sectorId2: checked ? currentBoulder.sectorId2 : undefined 
                            })}
                            className="border-[#E7F7E9] data-[state=checked]:bg-[#36B531] data-[state=checked]:text-white"
                          />
                          <Label htmlFor="spans-multiple-sectors-batch" className="cursor-pointer text-sm text-[#13112B]">
                            Verläuft über mehrere Sektoren
                          </Label>
                        </div>
                        {currentBoulder.spansMultipleSectors && (
                          <div className="space-y-2 w-full box-border min-w-0">
                            <Label className="text-sm font-medium text-[#13112B]">Endet in Sektor</Label>
                            <div className="w-full overflow-x-auto overflow-y-hidden pb-2 box-border -mx-1 px-1 scrollbar-hide touch-pan-x">
                              <div className="flex gap-2 min-w-max">
                                {sectors?.filter(s => s.id !== currentBoulder.sectorId).map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => updateCurrentBoulder({ sectorId2: s.id })}
                                    disabled={!currentBoulder.sectorId}
                                    className={cn(
                                      "flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap h-11",
                                      currentBoulder.sectorId2 === s.id
                                        ? "bg-[#36B531] text-white border-[#36B531] shadow-sm"
                                        : "bg-white text-[#13112B] border-[#E7F7E9] hover:bg-[#E7F7E9] hover:text-[#13112B]",
                                      !currentBoulder.sectorId && "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    {s.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2 w-full box-border min-w-0">
                            <Label className="text-sm font-medium text-[#13112B]">Farbe</Label>
                            {colors && colors.length > 0 ? (
                                <div className="w-full flex gap-2 flex-wrap">
                                    {colors.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                const newName = adjustNameForColor(c.id);
                                                updateCurrentBoulder({ colorId: c.id, name: newName });
                                            }}
                                            className={cn(
                                                "flex-shrink-0 w-11 h-11 rounded-xl transition-all border-2 flex items-center justify-center",
                                                currentBoulder.colorId === c.id
                                                    ? "border-[#36B531] shadow-lg scale-110 ring-2 ring-[#36B531] ring-offset-2"
                                                    : "border-[#E7F7E9] hover:border-[#36B531]/50 hover:scale-105"
                                            )}
                                            style={getColorBackgroundStyle(c.name, colors)}
                                            title={c.name}
                                        >
                                            {currentBoulder.colorId === c.id && (
                                                <div className="w-3 h-3 rounded-xl bg-white/90 shadow-sm" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-[#13112B]/60">Farben werden geladen...</div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2 w-full box-border min-w-0">
                        <Label className="text-sm font-medium text-[#13112B]">Schwierigkeit: {currentBoulder.difficulty || '?'}</Label>
                        <div className="grid grid-cols-9 gap-1.5 w-full min-w-0">
                            {[null, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                                <button
                                    key={level === null ? '?' : level}
                                    type="button"
                                    onClick={() => {
                                        const color = colors?.find(c => c.id === currentBoulder.colorId);
                                        const newName = color 
                                            ? generateBoulderName(color.name, level)
                                            : generateBoulderName('Grün', level);
                                        updateCurrentBoulder({ difficulty: level, name: newName });
                                    }}
                                    className={cn(
                                        "w-full aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all border min-w-0",
                                        currentBoulder.difficulty === level 
                                            ? "bg-[#36B531] text-white border-[#36B531] shadow-sm" 
                                            : "bg-white text-[#13112B] border-[#E7F7E9] hover:bg-[#E7F7E9] hover:text-[#13112B]"
                                    )}
                                >
                                    {level === null ? '?' : level}
                                </button>
                            ))}
                        </div>
                    </div>
                  </div>
                </div>
          </div>

            <div className="sticky bottom-0 bg-white border-t border-[#E7F7E9] px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 rounded-b-2xl">
              <Button
                variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 h-11 border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] hover:text-[#13112B] rounded-xl"
              >
                    Abbrechen
              </Button>
              <Button
                    onClick={saveBoulderFromDialog} 
                    className="flex-1 h-11 bg-[#36B531] text-white hover:bg-[#2da029] rounded-xl"
                >
                    {isEditing ? 'Speichern' : 'Hinzufügen'}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Floating Actions */}
      <div className="fixed bottom-[calc(104px+env(safe-area-inset-bottom,0px))] right-4 z-40 md:hidden flex items-center gap-3">
        <Button
          onClick={uploadAll} 
          size="icon" 
          disabled={isProcessing || boulders.length === 0}
          className="h-14 w-14 rounded-xl shadow-xl bg-gray-700 hover:bg-gray-800 text-white transition-all hover:scale-105 disabled:opacity-50 disabled:grayscale"
        >
          {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudUpload className="h-8 w-8" />}
        </Button>
        <Button
          onClick={openAddDialog} 
          size="icon" 
          className="h-14 w-14 rounded-xl shadow-xl bg-[#36B531] hover:bg-[#2da029] text-white transition-all hover:scale-105"
        >
          <Plus className="h-8 w-8" />
        </Button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-end items-center mb-6">
        <div className="flex gap-2">
            <Button onClick={uploadAll} disabled={isProcessing || boulders.length === 0} className="bg-gray-700 hover:bg-gray-800 text-white rounded-xl h-11">
                {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CloudUpload className="w-5 h-5 mr-2" />}
                Alle hochladen ({boulders.length})
              </Button>
            <Button onClick={openAddDialog} size="sm" className="bg-[#36B531] hover:bg-[#2da029] text-white rounded-xl h-11">
              <Plus className="w-5 h-5 mr-2" />
              Boulder hinzufügen
                      </Button>
                    </div>
                  </div>

      {/* List */}
      <div className="grid gap-3 max-w-2xl mx-auto">
        {boulders.length === 0 && (
            <div className="text-center py-12 text-[#13112B]/60 border-2 border-dashed border-[#E7F7E9] rounded-2xl bg-white">
                <p>Noch keine Boulder hinzugefügt.</p>
                <Button variant="link" onClick={openAddDialog} className="text-[#36B531] hover:text-[#2da029]">Jetzt hinzufügen</Button>
                    </div>
                  )}
        {boulders.map((boulder) => (
          <div key={boulder.id} className="group relative flex items-center gap-3 p-3 rounded-2xl border border-[#E7F7E9] bg-white hover:shadow-md transition-all">
            <div className="relative h-24 w-16 flex-shrink-0 rounded-xl overflow-hidden bg-[#F9FAF9] cursor-pointer border border-[#E7F7E9] shadow-sm" onClick={() => openEditDialog(boulder)}>
                {boulder.thumbFile ? (
                    <img src={URL.createObjectURL(boulder.thumbFile)} alt={boulder.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-[#13112B]/30" /></div>
                      )}
                    </div>
            <div className="flex-1 min-w-0 cursor-pointer px-1" onClick={() => openEditDialog(boulder)}>
                <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-bold text-base text-[#13112B] truncate">{boulder.name || 'Unbenannt'}</h3>
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-xl bg-[#36B531] text-[10px] font-bold text-white flex-shrink-0">{boulder.difficulty || '?'}</span>
                  </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#13112B]/60">
                    <span className="truncate max-w-[100px]">{sectors?.find(s => s.id === boulder.sectorId)?.name || 'Sektor?'}</span>
                    <span>•</span>
                    <span>{colors?.find(c => c.id === boulder.colorId)?.name || 'Farbe?'}</span>
                    </div>
                  </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-[#13112B]/60 hover:text-[#E74C3C] hover:bg-red-50 rounded-xl" onClick={() => removeBoulder(boulder.id)} disabled={isProcessing}>
                <Trash2 className="w-6 h-6" />
                        </Button>
                      </div>
        ))}
                    </div>
                      </div>
  );
};
