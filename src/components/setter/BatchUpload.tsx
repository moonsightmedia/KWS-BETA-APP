import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Trash2, Upload, X, CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { useCreateBoulder, useUpdateBoulder } from '@/hooks/useBoulders';
import { uploadBetaVideo, uploadThumbnail } from '@/integrations/supabase/storage';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { generateBoulderName } from '@/utils/nameGenerator';
import { listenForUploadEvents } from '@/utils/backgroundUpload';
import { useUploadTracker } from '@/hooks/useUploadTracker';
import { supabase } from '@/integrations/supabase/client';

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
  status: 'draft' | 'uploading' | 'partially_uploaded' | 'completed' | 'failed';
  progress: number;
  error?: string;
  boulderId?: string;
  currentStep?: string; // Z.B. "Komprimierung...", "Video-Upload...", "Thumbnail-Upload..."
  isRestored?: boolean; // Flag to mark restored drafts from localStorage
  // Upload status tracking
  videoUploaded?: boolean; // Video bereits hochgeladen?
  thumbnailUploaded?: boolean; // Thumbnail bereits hochgeladen?
  uploadedVideoUrl?: string; // URL des hochgeladenen Videos (falls bereits hochgeladen)
  uploadedThumbnailUrl?: string; // URL des hochgeladenen Thumbnails
  uploadSessionId?: string; // Session ID für Resume bei Chunked Uploads
  uploadedChunks?: number[]; // Bereits hochgeladene Chunk-Indizes für Resume
}

const DIFFICULTIES = [null, 1, 2, 3, 4, 5, 6, 7, 8];

interface BatchUploadProps {
  onAddBoulderRef?: (addBoulderFn: () => void) => void;
}

export const BatchUpload = ({ onAddBoulderRef }: BatchUploadProps = {}) => {
  const navigate = useNavigate();
  const { data: sectors } = useSectorsTransformed();
  const { data: colorsDb } = useColors();
  const createBoulder = useCreateBoulder();
  const updateBoulder = useUpdateBoulder();
  const { activeUploads, getBoulderUploads, refetch: refetchUploads } = useUploadTracker();

  // Load boulder drafts from localStorage on mount
  const loadDraftsFromStorage = (): BoulderDraft[] => {
    try {
      const saved = localStorage.getItem('boulder-drafts');
      if (saved) {
        const drafts = JSON.parse(saved) as Array<Omit<BoulderDraft, 'videoFile' | 'thumbnailFile'>>;
        // Only restore 'draft' and 'failed' status - 'uploading' and 'partially_uploaded' become 'failed'
        const restoredDrafts = drafts
          .filter(draft => draft.status === 'draft' || draft.status === 'failed')
          .map(draft => {
            // If status was 'uploading' or 'partially_uploaded', mark as 'failed' (upload was interrupted)
            const finalStatus = (draft.status === 'draft' || draft.status === 'failed') 
              ? draft.status 
              : 'failed';
            
            return {
              ...draft,
              status: finalStatus as 'draft' | 'failed',
              videoFile: null, // Files can't be restored from localStorage
              thumbnailFile: null,
              isRestored: true, // Mark as restored from localStorage
              // Upload status flags and URLs are preserved from localStorage
            };
          });
        
        return restoredDrafts;
      }
    } catch (error) {
      console.warn('[BatchUpload] Error loading drafts from localStorage:', error);
    }
    return [];
  };

  // Load boulders from database based on active uploads
  const loadBouldersFromUploads = useCallback(async (activeBoulderUploads: any[]) => {
    console.log('[BatchUpload] 🔄 [loadBouldersFromUploads] START');
    console.log('[BatchUpload] 📋 [loadBouldersFromUploads] Input:', {
      activeBoulderUploadsCount: activeBoulderUploads.length,
      activeBoulderUploads: activeBoulderUploads.map(u => ({
        boulder_id: u.boulder_id,
        file_name: u.file_name,
        file_type: u.file_type,
        status: u.status
      }))
    });
    
    // Get unique boulder IDs from uploads
    const boulderIds = [...new Set(activeBoulderUploads.map(u => u.boulder_id).filter(Boolean))];
    
    console.log('[BatchUpload] 🔍 [loadBouldersFromUploads] Schritt 1: Extrahiere Boulder-IDs:', {
      boulderIdsCount: boulderIds.length,
      boulderIds
    });
    
    if (boulderIds.length === 0) {
      console.log('[BatchUpload] ⚠️ [loadBouldersFromUploads] Keine Boulder-IDs in Uploads gefunden');
      return [];
    }
    
    console.log(`[BatchUpload] 🔄 [loadBouldersFromUploads] Schritt 2: Lade ${boulderIds.length} Boulder aus DB...`);
    
    // Load boulder data from database
    const { data: bouldersData, error } = await supabase
      .from('boulders')
      .select('*')
      .in('id', boulderIds);
    
    console.log('[BatchUpload] 📊 [loadBouldersFromUploads] Schritt 3: DB-Query Ergebnis:', {
      hasError: !!error,
      error: error ? error.message : null,
      bouldersDataCount: bouldersData?.length || 0,
      bouldersData: bouldersData?.map(b => ({
        id: b.id,
        name: b.name,
        sector_id: b.sector_id
      })) || []
    });
    
    if (error) {
      console.error('[BatchUpload] ❌ [loadBouldersFromUploads] Fehler beim Laden der Boulder aus DB:', error);
      return [];
    }
    
    if (!bouldersData || bouldersData.length === 0) {
      console.log('[BatchUpload] ⚠️ [loadBouldersFromUploads] Keine Boulder in DB gefunden für IDs:', boulderIds);
      return [];
    }
    
    console.log(`[BatchUpload] ✅ [loadBouldersFromUploads] Schritt 4: ${bouldersData.length} Boulder aus DB geladen`);
    
    // Create BoulderDraft objects from DB data
    const loadedBoulders: BoulderDraft[] = bouldersData.map(b => {
      // Handle sector_id_2 - it might not exist in the type, so use type assertion
      const boulderData = b as any;
      const draft = {
        id: `boulder-${Date.now()}-${b.id}`, // Generate a unique ID for the draft
        name: b.name,
        sector_id: b.sector_id,
        sector_id_2: boulderData.sector_id_2 || null,
        spansMultipleSectors: !!boulderData.sector_id_2,
        difficulty: b.difficulty,
        color: b.color,
        note: b.note || '',
        videoFile: null, // Files can't be restored
        videoUrl: b.beta_video_url || '',
        thumbnailFile: null,
        status: 'uploading' as const, // Set to uploading since uploads are active
        progress: 0, // Will be updated by sync
        boulderId: b.id,
        currentStep: 'Synchronisiere...',
      };
      
      console.log(`[BatchUpload] 📝 [loadBouldersFromUploads] Erstelle Draft für "${b.name}":`, {
        draftId: draft.id,
        boulderId: draft.boulderId,
        status: draft.status,
        progress: draft.progress
      });
      
      return draft;
    });
    
    console.log('[BatchUpload] 📊 [loadBouldersFromUploads] Schritt 5: Erstellte Drafts:', {
      loadedBouldersCount: loadedBoulders.length,
      loadedBoulders: loadedBoulders.map(b => ({
        id: b.id,
        name: b.name,
        boulderId: b.boulderId,
        status: b.status
      }))
    });
    
    // Add to local state
    console.log('[BatchUpload] 🔄 [loadBouldersFromUploads] Schritt 6: Füge Boulder zum lokalen State hinzu...');
    setBoulders(prevBoulders => {
      console.log('[BatchUpload] 📊 [loadBouldersFromUploads] Vorheriger State:', {
        prevBouldersCount: prevBoulders.length,
        prevBouldersWithId: prevBoulders.filter(b => b.boulderId).map(b => b.boulderId)
      });
      
      // Merge with existing boulders, avoid duplicates
      const existingIds = new Set(prevBoulders.map(b => b.boulderId).filter(Boolean));
      const newBoulders = loadedBoulders.filter(b => b.boulderId && !existingIds.has(b.boulderId));
      
      console.log('[BatchUpload] 🔍 [loadBouldersFromUploads] Duplikat-Prüfung:', {
        existingIdsCount: existingIds.size,
        existingIds: Array.from(existingIds),
        newBouldersCount: newBoulders.length,
        newBoulders: newBoulders.map(b => ({
          id: b.id,
          name: b.name,
          boulderId: b.boulderId
        }))
      });
      
      if (newBoulders.length > 0) {
        console.log(`[BatchUpload] ➕ [loadBouldersFromUploads] Füge ${newBoulders.length} neue Boulder zum lokalen State hinzu`);
        const updatedBoulders = [...prevBoulders, ...newBoulders];
        console.log('[BatchUpload] 📊 [loadBouldersFromUploads] Neuer State:', {
          updatedBouldersCount: updatedBoulders.length,
          updatedBouldersWithId: updatedBoulders.filter(b => b.boulderId).map(b => ({
            id: b.id,
            name: b.name,
            boulderId: b.boulderId
          }))
        });
        return updatedBoulders;
      }
      
      console.log('[BatchUpload] ⚠️ [loadBouldersFromUploads] Keine neuen Boulder hinzugefügt (alle bereits vorhanden)');
      return prevBoulders;
    });
    
    console.log('[BatchUpload] ✅ [loadBouldersFromUploads] ENDE - Rückgabe:', {
      loadedBouldersCount: loadedBoulders.length
    });
    
    return loadedBoulders;
  }, []);

  // Save boulder drafts to localStorage whenever they change
  const saveDraftsToStorage = (drafts: BoulderDraft[]) => {
    try {
      // Only save 'draft' and 'failed' status - 'uploading' and 'partially_uploaded' are not saved
      // (they will be treated as 'failed' on reload if upload was interrupted)
      const draftsToSave = drafts
        .filter(b => b.status === 'draft' || b.status === 'failed')
        .map(({ videoFile, thumbnailFile, isRestored, ...rest }) => {
          // Remove File objects (can't be serialized) and isRestored flag (will be set on restore)
          return rest;
        });
      
      if (draftsToSave.length > 0) {
        localStorage.setItem('boulder-drafts', JSON.stringify(draftsToSave));
      } else {
        localStorage.removeItem('boulder-drafts');
      }
    } catch (error) {
      console.warn('[BatchUpload] Error saving drafts to localStorage:', error);
    }
  };

  const [boulders, setBoulders] = useState<BoulderDraft[]>(() => loadDraftsFromStorage());
  
  // Show toast notification only once when drafts are restored
  const hasShownRestoreToast = useRef(false);
  useEffect(() => {
    if (boulders.length > 0 && !hasShownRestoreToast.current) {
      // Check if these are restored drafts (they have the isRestored flag)
      const restoredDrafts = boulders.filter(b => b.isRestored === true);
      if (restoredDrafts.length > 0) {
        hasShownRestoreToast.current = true;
        toast.info(`${restoredDrafts.length} gespeicherte Boulder-Entwürfe wiederhergestellt. Bitte Dateien erneut auswählen.`, {
          duration: 5000,
        });
      }
    }
  }, [boulders]);
  const [isUploading, setIsUploading] = useState(false); // Upload-Prozess läuft
  const [showUploadDialog, setShowUploadDialog] = useState(false); // Dialog-Sichtbarkeit (separat von isUploading)
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Array<{ boulderName: string; error: string; type: 'video' | 'thumbnail' | 'creation' }>>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Save drafts to localStorage whenever boulders change
  useEffect(() => {
    saveDraftsToStorage(boulders);
  }, [boulders]);

  // Sync progress from database when tab becomes visible again
  // This ensures that if user switches tabs and comes back, they see the current progress
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[BatchUpload] 🔄 TAB-WECHSEL SYNCHRONISATION GESTARTET');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[BatchUpload] 📊 Schritt 0: Initial State:', {
          bouldersCount: boulders.length,
          bouldersWithId: boulders.filter(b => b.boulderId).length,
          bouldersWithoutId: boulders.filter(b => !b.boulderId).length,
          isUploading,
          showUploadDialog,
          activeUploadsCount: activeUploads.length,
          bouldersDetails: boulders.map(b => ({
            id: b.id,
            name: b.name,
            boulderId: b.boulderId,
            status: b.status,
            progress: b.progress,
            currentStep: b.currentStep
          }))
        });
        
        // ALWAYS check database for active uploads, not just local state
        // This fixes the issue where progress is lost after tab switch
        console.log('[BatchUpload] 🔄 Schritt 1: Refetch upload status from database...');
        
        // Refetch upload status from database FIRST
        const refetchResult = await refetchUploads();
        console.log('[BatchUpload] ✅ Schritt 1 abgeschlossen - Refetch Result:', refetchResult);
        
        // Wait longer to ensure refetch has updated the state and activeUploads is populated
        // Use multiple small delays to ensure React state has updated
        console.log('[BatchUpload] ⏳ Schritt 2: Warte auf State-Update (300ms)...');
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('[BatchUpload] ⏳ Schritt 3: Warte auf State-Update (300ms)...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get fresh activeUploads from the hook (it's already an array)
        // Force a re-read by accessing it fresh
        const allActiveUploads = activeUploads || [];
        console.log('[BatchUpload] 📦 Schritt 4: Aktive Uploads aus Hook:', {
          activeUploadsType: typeof activeUploads,
          activeUploadsIsArray: Array.isArray(activeUploads),
          activeUploadsLength: activeUploads?.length || 0,
          allActiveUploadsLength: allActiveUploads.length,
          allActiveUploads: allActiveUploads.map(u => ({
            sessionId: u.upload_session_id,
            boulderId: u.boulder_id,
            fileName: u.file_name,
            fileType: u.file_type,
            status: u.status,
            progress: u.progress
          }))
        });
        
        const activeBoulderUploads = allActiveUploads.filter(u => u.boulder_id !== null);
        const hasActiveBouldersInDb = activeBoulderUploads.length > 0;
        
        console.log('[BatchUpload] 🔍 Schritt 5: Filtere Boulder-Uploads:', {
          totalActiveUploads: allActiveUploads.length,
          activeBoulderUploadsCount: activeBoulderUploads.length,
          hasActiveBouldersInDb,
          activeBoulderUploads: activeBoulderUploads.map(u => ({
            boulderId: u.boulder_id,
            fileName: u.file_name,
            status: u.status,
            progress: u.progress
          }))
        });
        
        // Also check local state - calculate inline to avoid dependency issues
        const hasActiveBoulders = boulders.some(b => 
          b.status === 'uploading' || 
          (b.boulderId && b.status !== 'completed' && b.status !== 'failed')
        );
        
        console.log('[BatchUpload] 🔍 Schritt 6: Prüfe lokalen State:', {
          hasActiveBoulders,
          bouldersCount: boulders.length,
          bouldersWithId: boulders.filter(b => b.boulderId).map(b => ({
            id: b.id,
            name: b.name,
            boulderId: b.boulderId,
            status: b.status,
            progress: b.progress
          })),
          bouldersWithoutId: boulders.filter(b => !b.boulderId).length
        });
        
        console.log('[BatchUpload] 📊 Schritt 7: Zusammenfassung:', {
          totalActiveUploads: allActiveUploads.length,
          activeBoulderUploads: activeBoulderUploads.length,
          hasActiveBouldersInDb,
          hasActiveBoulders,
          isUploading,
          showUploadDialog,
          bouldersWithId: boulders.filter(b => b.boulderId).length
        });
        
        // ALWAYS open dialog if there are active uploads in DB, even if local state is empty
        // This handles the case where the page was reloaded or state was lost
        // IMPORTANT: Always open dialog if there are active uploads, even if it was already open
        // This ensures the dialog is visible after tab switch
        if (hasActiveBouldersInDb) {
          if (!showUploadDialog) {
            console.log('[BatchUpload] 📂 Schritt 8: Aktive Uploads in DB gefunden, öffne Dialog automatisch');
            setShowUploadDialog(true);
          } else {
            console.log('[BatchUpload] ✅ Schritt 8: Dialog bereits geöffnet und aktive Uploads gefunden');
          }
          
          // If no boulders in local state, load them from DB
          if (!hasActiveBoulders) {
            console.log('[BatchUpload] 🔄 Schritt 9: Keine Boulder im lokalen State, lade aus DB...');
            console.log('[BatchUpload] 📋 Schritt 9: Boulder-IDs zum Laden:', activeBoulderUploads.map(u => u.boulder_id));
            
            const loadedBoulders = await loadBouldersFromUploads(activeBoulderUploads);
            
            console.log('[BatchUpload] 📊 Schritt 10: Ergebnis des Ladens:', {
              loadedBouldersCount: loadedBoulders?.length || 0,
              loadedBoulders: loadedBoulders?.map(b => ({
                id: b.id,
                name: b.name,
                boulderId: b.boulderId,
                status: b.status,
                progress: b.progress
              })) || []
            });
            
            if (loadedBoulders && loadedBoulders.length > 0) {
              console.log(`[BatchUpload] ✅ Schritt 10: ${loadedBoulders.length} Boulder aus DB geladen`);
              // Wait a bit for state to update, then sync progress
              console.log('[BatchUpload] ⏳ Schritt 11: Warte auf State-Update nach Laden (300ms)...');
              await new Promise(resolve => setTimeout(resolve, 300));
              console.log('[BatchUpload] 🔄 Schritt 12: Refetch Uploads nach Laden...');
              await refetchUploads();
              console.log('[BatchUpload] ⏳ Schritt 13: Warte auf State-Update nach Refetch (200ms)...');
              await new Promise(resolve => setTimeout(resolve, 200));
            } else {
              console.log('[BatchUpload] ⚠️ Schritt 10: Keine Boulder konnten aus DB geladen werden');
            }
          } else {
            console.log('[BatchUpload] ✅ Schritt 9: Boulder bereits im lokalen State vorhanden');
          }
        } else {
          console.log('[BatchUpload] ⚠️ Schritt 8: Keine aktiven Uploads in DB gefunden');
          // Don't close dialog here - let the auto-close logic handle it
        }
        
        // Re-check state after potential loading
        const currentBoulders = boulders; // Capture current state
        const hasActiveBouldersAfterLoad = currentBoulders.some(b => 
          b.status === 'uploading' || 
          (b.boulderId && b.status !== 'completed' && b.status !== 'failed')
        );
        
        console.log('[BatchUpload] 🔍 Schritt 14: State nach Laden:', {
          bouldersCount: currentBoulders.length,
          hasActiveBouldersAfterLoad,
          bouldersWithId: currentBoulders.filter(b => b.boulderId).map(b => ({
            id: b.id,
            name: b.name,
            boulderId: b.boulderId,
            status: b.status,
            progress: b.progress
          }))
        });
        
        // If there are active uploads in DB or local state, sync progress
        if (hasActiveBouldersInDb || hasActiveBouldersAfterLoad || isUploading) {
          console.log('[BatchUpload] 🔄 Schritt 15: Starte Progress-Synchronisation...');
          
          // Update boulder progress from database
          setBoulders((prevBoulders) => {
            console.log('[BatchUpload] 📊 Schritt 16: Synchronisiere Progress für Boulder:', {
              prevBouldersCount: prevBoulders.length,
              prevBouldersWithId: prevBoulders.filter(b => b.boulderId).length
            });
            
            let hasChanges = false;
            const updatedBoulders = prevBoulders.map((boulder) => {
              // Only sync if boulder has a database ID (was created)
              if (boulder.boulderId) {
                console.log(`[BatchUpload] 🔍 Schritt 17: Prüfe Boulder "${boulder.name}" (${boulder.boulderId})`);
                
                const uploads = getBoulderUploads(boulder.boulderId);
                
                console.log(`[BatchUpload] 📋 Schritt 18: Uploads für "${boulder.name}":`, {
                  uploadsCount: uploads.length,
                  uploads: uploads.map(u => ({
                    type: u.file_type,
                    status: u.status,
                    progress: u.progress,
                    sessionId: u.upload_session_id
                  })),
                  boulderThumbnailUploaded: boulder.thumbnailUploaded,
                  boulderUploadedThumbnailUrl: boulder.uploadedThumbnailUrl
                });
                
                if (uploads.length > 0) {
                  // Get video and thumbnail uploads separately
                  const videoUpload = uploads.find(u => u.file_type === 'video');
                  const thumbnailUpload = uploads.find(u => u.file_type === 'thumbnail');
                  
                  // Check if thumbnail is completed (even if not in active uploads)
                  const thumbnailCompleted = boulder.thumbnailUploaded || !!boulder.uploadedThumbnailUrl;
                  
                  console.log(`[BatchUpload] 🎥 Schritt 19: Video/Thumbnail für "${boulder.name}":`, {
                    hasVideoUpload: !!videoUpload,
                    videoStatus: videoUpload?.status,
                    videoProgress: videoUpload?.progress,
                    hasThumbnailUpload: !!thumbnailUpload,
                    thumbnailStatus: thumbnailUpload?.status,
                    thumbnailProgress: thumbnailUpload?.progress,
                    thumbnailCompleted,
                    boulderThumbnailUploaded: boulder.thumbnailUploaded,
                    boulderUploadedThumbnailUrl: boulder.uploadedThumbnailUrl
                  });
                  
                  // Map upload status to boulder progress
                  let newProgress = boulder.progress;
                  let newStatus = boulder.status;
                  let newCurrentStep = boulder.currentStep;
                  
                  // Prioritize video upload status (it's the main upload)
                  const mainUpload = videoUpload || thumbnailUpload || uploads[0];
                  
                  console.log(`[BatchUpload] 🎯 Schritt 20: Main Upload für "${boulder.name}":`, {
                    mainUploadType: mainUpload.file_type,
                    mainUploadStatus: mainUpload.status,
                    mainUploadProgress: mainUpload.progress
                  });
                  
                  if (mainUpload.status === 'completed') {
                    // Check if both video and thumbnail are completed
                    if (videoUpload?.status === 'completed' && (!boulder.thumbnailFile || thumbnailUpload?.status === 'completed')) {
                      newProgress = 100;
                      newStatus = 'completed';
                      newCurrentStep = 'Fertig!';
                    } else if (videoUpload?.status === 'completed') {
                      newProgress = Math.max(boulder.progress, 90);
                      newStatus = 'partially_uploaded';
                      newCurrentStep = 'Thumbnail wird hochgeladen...';
                    } else {
                      newProgress = Math.max(boulder.progress, mainUpload.progress);
                      newStatus = 'uploading';
                      newCurrentStep = 'Upload läuft...';
                    }
                  } else if (mainUpload.status === 'uploading') {
                    // For video uploads, progress is 10-90% (video phase)
                    // For thumbnail uploads, progress is 20-30% (thumbnail phase)
                    if (videoUpload && videoUpload.status === 'uploading') {
                      // Video upload: 10% (boulder created) + 0-80% (video upload)
                      newProgress = Math.max(boulder.progress, 10 + (videoUpload.progress * 0.8));
                      newStatus = 'uploading';
                      newCurrentStep = `Video hochladen... ${Math.round(videoUpload.progress)}%`;
                    } else if (thumbnailUpload && thumbnailUpload.status === 'uploading') {
                      // Thumbnail upload: 20% (thumbnail phase)
                      newProgress = Math.max(boulder.progress, 20 + (thumbnailUpload.progress * 0.1));
                      newStatus = 'uploading';
                      newCurrentStep = `Thumbnail hochladen... ${Math.round(thumbnailUpload.progress)}%`;
                    } else {
                      newProgress = Math.max(boulder.progress, mainUpload.progress);
                      newStatus = 'uploading';
                      newCurrentStep = `Hochladen... ${Math.round(mainUpload.progress)}%`;
                    }
                  } else if (mainUpload.status === 'compressing') {
                    // Compression phase: 10% (boulder created) + 0-10% (compression, which is 0-50% of video phase)
                    // Video phase is 10-90% (80% of total), so compression is 10% + (compression_progress * 0.1)
                    // But we need to account for the fact that compression progress is 0-100%, representing 0-50% of video phase
                    // So: 10% base + (compression_progress / 100 * 10%) = 10% + (compression_progress * 0.1)
                    const compressionProgress = mainUpload.progress || 0;
                    const compressionPhaseProgress = 10 + (compressionProgress * 0.1);
                    
                    // Check if thumbnail is completed (even if not in active uploads)
                    const thumbnailCompleted = boulder.thumbnailUploaded || !!boulder.uploadedThumbnailUrl;
                    
                    console.log(`[BatchUpload] 🔍 Schritt 20.5: Thumbnail-Status für "${boulder.name}":`, {
                      thumbnailCompleted,
                      boulderThumbnailUploaded: boulder.thumbnailUploaded,
                      boulderUploadedThumbnailUrl: boulder.uploadedThumbnailUrl,
                      hasThumbnailUpload: !!thumbnailUpload,
                      thumbnailUploadStatus: thumbnailUpload?.status
                    });
                    
                    if (thumbnailUpload && (thumbnailUpload.status === 'uploading' || thumbnailUpload.status === 'completed')) {
                      // Thumbnail phase: 20% base + 0-10% (thumbnail upload)
                      const thumbnailPhaseProgress = thumbnailUpload.status === 'completed' 
                        ? 30  // Thumbnail completed = 20% base + 10% upload
                        : 20 + (thumbnailUpload.progress * 0.1);
                      newProgress = Math.max(boulder.progress, Math.max(compressionPhaseProgress, thumbnailPhaseProgress));
                      newStatus = 'uploading';
                      newCurrentStep = thumbnailUpload.status === 'completed' 
                        ? 'Thumbnail fertig, Video wird komprimiert...' 
                        : `Thumbnail hochladen... ${Math.round(thumbnailUpload.progress)}%`;
                    } else if (thumbnailCompleted) {
                      // Thumbnail is completed (but not in active uploads), so we're at 30%
                      // But we should show the compression progress if it's higher
                      const maxProgress = Math.max(compressionPhaseProgress, 30);
                      newProgress = Math.max(boulder.progress, maxProgress);
                      newStatus = 'uploading';
                      newCurrentStep = `Thumbnail fertig, Video wird komprimiert... ${Math.round(compressionProgress)}%`;
                      console.log(`[BatchUpload] ✅ Schritt 20.6: Thumbnail fertig erkannt für "${boulder.name}": Progress=${newProgress}%, Step="${newCurrentStep}"`);
                    } else {
                      newProgress = Math.max(boulder.progress, compressionPhaseProgress);
                      newStatus = 'uploading';
                      newCurrentStep = `Komprimieren... ${Math.round(compressionProgress)}%`;
                    }
                  } else if (mainUpload.status === 'failed') {
                    newStatus = 'failed';
                    newCurrentStep = mainUpload.error_message || 'Upload fehlgeschlagen';
                  }
                  
                  console.log(`[BatchUpload] 📊 Schritt 21: Progress-Berechnung für "${boulder.name}":`, {
                    oldProgress: boulder.progress,
                    newProgress,
                    oldStatus: boulder.status,
                    newStatus,
                    oldStep: boulder.currentStep,
                    newStep: newCurrentStep,
                    willUpdate: newProgress !== boulder.progress || newStatus !== boulder.status || newCurrentStep !== boulder.currentStep
                  });
                  
                  // Only update if something changed
                  if (newProgress !== boulder.progress || newStatus !== boulder.status || newCurrentStep !== boulder.currentStep) {
                    console.log(`[BatchUpload] ✅ Schritt 22: Aktualisiere "${boulder.name}": ${boulder.progress}% → ${newProgress}%, ${boulder.status} → ${newStatus}`);
                    hasChanges = true;
                    return {
                      ...boulder,
                      progress: newProgress,
                      status: newStatus,
                      currentStep: newCurrentStep,
                    };
                  } else {
                    console.log(`[BatchUpload] ✅ Schritt 22: "${boulder.name}" bereits synchronisiert (${boulder.progress}%, ${boulder.status})`);
                  }
                } else {
                  console.log(`[BatchUpload] ⚠️ Schritt 18: Keine Uploads gefunden für "${boulder.name}" (${boulder.boulderId})`);
                }
              } else {
                console.log(`[BatchUpload] ⚠️ Schritt 17: Boulder "${boulder.name}" hat keine boulderId, überspringe`);
              }
              
              return boulder;
            });
            
            console.log('[BatchUpload] 📊 Schritt 23: Synchronisation abgeschlossen:', {
              hasChanges,
              updatedBouldersCount: updatedBoulders.length,
              updatedBouldersWithId: updatedBoulders.filter(b => b.boulderId).length
            });
            
            return updatedBoulders;
          });
        } else {
          console.log('[BatchUpload] ⚠️ Schritt 15: Keine aktiven Uploads gefunden - keine Synchronisation');
        }
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[BatchUpload] ✅ TAB-WECHSEL SYNCHRONISATION ABGESCHLOSSEN');
        console.log('═══════════════════════════════════════════════════════════');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [boulders, isUploading, getBoulderUploads, refetchUploads, showUploadDialog, activeUploads, loadBouldersFromUploads]);

  // Clear completed boulders from storage after upload
  // Keep 'draft' and 'failed' boulders for retry
  const clearCompletedFromStorage = () => {
    try {
      const saved = localStorage.getItem('boulder-drafts');
      if (saved) {
        const drafts = JSON.parse(saved) as Array<Omit<BoulderDraft, 'videoFile' | 'thumbnailFile'>>;
        // Only keep 'draft' and 'failed' status - remove 'completed'
        const activeDrafts = drafts.filter(d => {
          const boulder = boulders.find(b => b.id === d.id);
          // Keep if status is 'draft' or 'failed', remove if 'completed'
          return boulder && (boulder.status === 'draft' || boulder.status === 'failed');
        });
        
        if (activeDrafts.length === 0) {
          localStorage.removeItem('boulder-drafts');
        } else {
          // Remove isRestored flag before saving (videoFile and thumbnailFile are already omitted in the type)
          const cleanedDrafts = activeDrafts.map(({ isRestored, ...rest }) => rest);
          localStorage.setItem('boulder-drafts', JSON.stringify(cleanedDrafts));
        }
      }
    } catch (error) {
      console.warn('[BatchUpload] Error clearing completed drafts from localStorage:', error);
    }
  };

  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const thumbnailInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const COLORS = colorsDb?.map(c => c.name) || ['Grün', 'Gelb', 'Blau', 'Orange', 'Rot', 'Schwarz', 'Weiß', 'Lila'];

  // Use useRef to store the latest function without causing re-renders
  const addBoulderRef = useRef<() => void>();
  
  // Create the addBoulder function
  const addBoulder = useCallback(() => {
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
      isRestored: false, // New boulder, not restored
    };
    setBoulders(prev => [newBoulder, ...prev]);
    console.log('[BatchUpload] Added new boulder:', newBoulder);
  }, [sectors, COLORS]);
  
  // Update the ref whenever addBoulder changes
  addBoulderRef.current = addBoulder;

  // Expose addBoulder function to parent via ref callback
  // Only call onAddBoulderRef when it changes, not when addBoulder changes
  const onAddBoulderRefRef = useRef(onAddBoulderRef);
  onAddBoulderRefRef.current = onAddBoulderRef;
  
  useEffect(() => {
    if (onAddBoulderRefRef.current) {
      // Pass a stable function that calls the current ref
      onAddBoulderRefRef.current(() => {
        if (addBoulderRef.current) {
          addBoulderRef.current();
        }
      });
    }
  }, [onAddBoulderRef]); // Only depend on onAddBoulderRef, not addBoulder

  const removeBoulder = (id: string) => {
    setBoulders(boulders.filter(b => b.id !== id));
    delete videoInputRefs.current[id];
    delete thumbnailInputRefs.current[id];
    // Update localStorage after removal
    clearCompletedFromStorage();
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
    // Only consider non-completed boulders for upload
    const activeBoulders = boulders.filter(b => b.status !== 'completed');
    if (activeBoulders.length === 0) {
      console.log('[BatchUpload] canUpload: false - no boulders');
      return false;
    }
    
    const invalidBoulders = activeBoulders.filter(b => {
      const hasName = !!b.name && b.name.trim().length > 0;
      const hasSector = !!b.sector_id && b.sector_id.trim().length > 0;
      const hasValidSector2 = !b.spansMultipleSectors || (b.spansMultipleSectors && !!b.sector_id_2 && b.sector_id_2 !== b.sector_id);
      const hasValidDifficulty = b.difficulty === null || (b.difficulty >= 1 && b.difficulty <= 8);
      const hasVideo = !!(b.videoFile || (b.videoUrl && typeof b.videoUrl === 'string' && b.videoUrl.trim().length > 0));
      
      const isValid = hasName && hasSector && hasValidSector2 && hasValidDifficulty && hasVideo;
      
      if (!isValid) {
        console.log('[BatchUpload] Invalid boulder:', {
          id: b.id,
          hasName,
          hasSector,
          hasValidSector2,
          hasValidDifficulty,
          hasVideo,
          name: b.name,
          sector_id: b.sector_id,
          sector_id_2: b.sector_id_2,
          spansMultipleSectors: b.spansMultipleSectors,
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

  // Retry upload for a single failed boulder - only upload missing parts
  const retryBoulderUpload = async (boulderId: string) => {
    const boulder = boulders.find(b => b.id === boulderId);
    if (!boulder || isUploading) return;

    setIsUploading(true);
    setShowUploadDialog(true); // Dialog öffnen beim Retry
    setCurrentUploadIndex(boulders.findIndex(b => b.id === boulderId));
    
    try {
      // Reset error and status
      updateBoulderField(boulder.id, 'error', undefined);
      updateBoulderField(boulder.id, 'status', 'uploading');
      
      // Calculate starting progress based on what's already uploaded
      let startProgress = 0;
      if (boulder.videoUploaded && boulder.uploadedVideoUrl) {
        startProgress = 70; // Video already uploaded
      } else if (boulder.boulderId) {
        startProgress = 10; // Boulder created, but video not uploaded
      }
      updateBoulderField(boulder.id, 'progress', startProgress);

      // If boulder was already created, use existing ID, otherwise create new
      let boulderDbId = boulder.boulderId;
      
      if (!boulderDbId) {
        // Create boulder in database
        const boulderData = {
          name: boulder.name,
          sector_id: boulder.sector_id,
          sector_id_2: boulder.spansMultipleSectors && boulder.sector_id_2 ? boulder.sector_id_2 : null,
          difficulty: boulder.difficulty,
          color: boulder.color,
          beta_video_url: boulder.uploadedVideoUrl || boulder.videoUrl || null,
          thumbnail_url: boulder.uploadedThumbnailUrl || null,
          note: boulder.note,
        };

        const createdBoulder = await createBoulder.mutateAsync(boulderData as any);
        if (!createdBoulder?.id) {
          throw new Error('Boulder wurde erstellt, aber keine ID zurückgegeben');
        }
        boulderDbId = createdBoulder.id;
        updateBoulderField(boulder.id, 'boulderId', boulderDbId);
        startProgress = 10;
        updateBoulderField(boulder.id, 'progress', startProgress);
      }

      // Upload video only if not already uploaded
      if (boulder.videoFile && !boulder.videoUploaded) {
        updateBoulderField(boulder.id, 'currentStep', 'Video wird hochgeladen...');
        const videoUrl = await uploadBetaVideo(
          boulder.videoFile,
          (progress) => {
            // Progress: startProgress to 70% for video upload
            const totalProgress = startProgress + (progress * (70 - startProgress) / 100);
            updateBoulderField(boulder.id, 'progress', totalProgress);
            updateBoulderField(boulder.id, 'currentStep', `Video hochladen... ${Math.round(progress)}%`);
          },
          boulderDbId
        );
        
        // Mark video as uploaded and save URL
        updateBoulderField(boulder.id, 'videoUploaded', true);
        updateBoulderField(boulder.id, 'uploadedVideoUrl', videoUrl);
        updateBoulderField(boulder.id, 'currentStep', 'Video-URL wird gespeichert...');
        await updateBoulder.mutateAsync({
          id: boulderDbId,
          beta_video_url: videoUrl,
        } as any);
        updateBoulderField(boulder.id, 'progress', 70);
      } else if (boulder.uploadedVideoUrl && boulderDbId) {
        // Video already uploaded, just update DB if needed
        updateBoulderField(boulder.id, 'currentStep', 'Video-URL wird aktualisiert...');
        await updateBoulder.mutateAsync({
          id: boulderDbId,
          beta_video_url: boulder.uploadedVideoUrl,
        } as any);
        updateBoulderField(boulder.id, 'progress', 70);
      }

      // Upload thumbnail only if not already uploaded
      if (boulder.thumbnailFile && !boulder.thumbnailUploaded) {
        updateBoulderField(boulder.id, 'currentStep', 'Thumbnail wird hochgeladen...');
        const thumbnailUrl = await uploadThumbnail(
          boulder.thumbnailFile,
          (progress) => {
            // Progress: 70-100% for thumbnail upload
            const totalProgress = 70 + (progress * 0.3);
            updateBoulderField(boulder.id, 'progress', totalProgress);
            updateBoulderField(boulder.id, 'currentStep', `Thumbnail hochladen... ${Math.round(progress)}%`);
          },
          boulderDbId
        );
        
        // Mark thumbnail as uploaded and save URL
        updateBoulderField(boulder.id, 'thumbnailUploaded', true);
        updateBoulderField(boulder.id, 'uploadedThumbnailUrl', thumbnailUrl);
        updateBoulderField(boulder.id, 'currentStep', 'Thumbnail-URL wird gespeichert...');
        await updateBoulder.mutateAsync({
          id: boulderDbId,
          thumbnail_url: thumbnailUrl,
        } as any);
      } else if (boulder.uploadedThumbnailUrl && boulderDbId) {
        // Thumbnail already uploaded, just update DB if needed
        updateBoulderField(boulder.id, 'currentStep', 'Thumbnail-URL wird aktualisiert...');
        await updateBoulder.mutateAsync({
          id: boulderDbId,
          thumbnail_url: boulder.uploadedThumbnailUrl,
        } as any);
      }

      updateBoulderField(boulder.id, 'currentStep', 'Fertig!');
      updateBoulderField(boulder.id, 'progress', 100);
      updateBoulderField(boulder.id, 'status', 'completed');
      toast.success(`Boulder "${boulder.name}" erfolgreich hochgeladen!`);
    } catch (error: any) {
      console.error(`[BatchUpload] Retry failed for ${boulder.name}:`, error);
      const errorMessage = error.message || 'Unbekannter Fehler';
      updateBoulderField(boulder.id, 'error', errorMessage);
      updateBoulderField(boulder.id, 'status', 'failed');
      toast.error(`Fehler beim erneuten Versuch: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setCurrentUploadIndex(null);
    }
  };

  const uploadAllBoulders = async () => {
    if (!canUpload || isUploading) return;

    // Request wake lock to prevent device from sleeping during upload
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[BatchUpload] Wake lock acquired for batch upload');
      } catch (err) {
        console.warn('[BatchUpload] Wake lock not available:', err);
      }
    }

    setIsUploading(true);
    setShowUploadDialog(true); // Dialog öffnen beim Upload-Start
    setCurrentUploadIndex(0);
    setUploadErrors([]); // Reset errors

    // Subscribe to Service Worker upload events for background uploads
    let cleanupServiceWorkerListener: (() => void) | null = null;
    try {
      cleanupServiceWorkerListener = listenForUploadEvents(
        (uploadId, result) => {
          // Upload completed in background
          console.log('[BatchUpload] Background upload completed:', uploadId, result);
          // Find boulder by upload session ID and update status
          // This will be handled by the upload functions themselves
        },
        (uploadId, error) => {
          // Upload failed in background
          console.error('[BatchUpload] Background upload failed:', uploadId, error);
          // Find boulder by upload session ID and mark as failed
          // This will be handled by the upload functions themselves
        }
      );
    } catch (error) {
      console.warn('[BatchUpload] Failed to setup service worker listener:', error);
    }

    const errors: Array<{ boulderName: string; error: string; type: 'video' | 'thumbnail' | 'creation' }> = [];

    try {
      for (let i = 0; i < boulders.length; i++) {
      const boulder = boulders[i];
      setCurrentUploadIndex(i);
      
      try {
        // Update status to uploading
        updateBoulderField(boulder.id, 'status', 'uploading');
        updateBoulderField(boulder.id, 'progress', 0);
        updateBoulderField(boulder.id, 'currentStep', 'Boulder wird erstellt...');

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
        updateBoulderField(boulder.id, 'progress', 10);
        updateBoulderField(boulder.id, 'currentStep', 'Boulder erstellt');

        // Upload video and thumbnail in parallel for maximum speed
        const uploadPromises: Promise<void>[] = [];
        let videoProgress = 0;
        let thumbnailProgress = 0;
        const hasVideo = !!boulder.videoFile;
        const hasThumbnail = !!boulder.thumbnailFile;

        // Upload video if file exists
        if (boulder.videoFile) {
          const fileSizeMB = (boulder.videoFile.size / (1024 * 1024)).toFixed(1);
          const isLargeFile = boulder.videoFile.size >= 50 * 1024 * 1024; // Updated threshold
          
          const videoUploadPromise = (async () => {
            try {
              if (isLargeFile) {
                updateBoulderField(boulder.id, 'currentStep', `Video komprimieren (${fileSizeMB} MB)...`);
              } else {
                updateBoulderField(boulder.id, 'currentStep', 'Video wird hochgeladen...');
              }
              
              const videoUrl = await uploadBetaVideo(
                boulder.videoFile!,
                (progress) => {
                  videoProgress = progress;
                  // Calculate combined progress: video is weighted more (70% of upload phase)
                  // Upload phase is 10-90%, video takes 70% of that, thumbnail 30%
                  const videoWeight = hasThumbnail ? 0.7 : 1.0;
                  const totalProgress = 10 + (progress * 0.8 * videoWeight);
                  updateBoulderField(boulder.id, 'progress', totalProgress);
                  
                  // Update step based on progress
                  if (isLargeFile) {
                    if (progress < 50) {
                      updateBoulderField(boulder.id, 'currentStep', `Video komprimieren... ${Math.round(progress * 0.5)}%`);
                    } else {
                      updateBoulderField(boulder.id, 'currentStep', `Video hochladen... ${Math.round((progress - 50) * 0.5)}%`);
                    }
                  } else {
                    updateBoulderField(boulder.id, 'currentStep', `Video hochladen... ${Math.round(progress)}%`);
                  }
                },
                createdBoulder.id
              );
              
              // Mark video as uploaded and save URL
              updateBoulderField(boulder.id, 'videoUploaded', true);
              updateBoulderField(boulder.id, 'uploadedVideoUrl', videoUrl);
              await updateBoulder.mutateAsync({
                id: createdBoulder.id,
                beta_video_url: videoUrl,
              } as any);
            } catch (error: any) {
              console.error(`[BatchUpload] Video upload failed for ${boulder.name}:`, error);
              const errorMessage = error.message || 'Unbekannter Fehler';
              updateBoulderField(boulder.id, 'error', `Video-Upload fehlgeschlagen: ${errorMessage}`);
              updateBoulderField(boulder.id, 'status', 'failed');
              errors.push({
                boulderName: boulder.name,
                error: errorMessage,
                type: 'video'
              });
              throw error; // Re-throw to mark promise as failed
            }
          })();
          
          uploadPromises.push(videoUploadPromise);
        }

        // Upload thumbnail if file exists (in parallel with video)
        if (boulder.thumbnailFile) {
          const thumbnailUploadPromise = (async () => {
            try {
              updateBoulderField(boulder.id, 'currentStep', 'Thumbnail wird verarbeitet...');
              const thumbnailUrl = await uploadThumbnail(
                boulder.thumbnailFile!,
                (progress) => {
                  thumbnailProgress = progress;
                  // Calculate combined progress: thumbnail is weighted less (30% of upload phase)
                  // Upload phase is 10-90%, video takes 70% of that, thumbnail 30%
                  const thumbnailWeight = hasVideo ? 0.3 : 1.0;
                  const totalProgress = 10 + (progress * 0.8 * thumbnailWeight);
                  updateBoulderField(boulder.id, 'progress', Math.max(totalProgress, boulder.progress));
                  
                  // Update step based on progress
                  if (progress < 45) {
                    updateBoulderField(boulder.id, 'currentStep', `Thumbnail komprimieren... ${Math.round(progress * 2.2)}%`);
                  } else {
                    updateBoulderField(boulder.id, 'currentStep', `Thumbnail hochladen... ${Math.round((progress - 45) * 1.8)}%`);
                  }
                },
                createdBoulder.id
              );
              
              // Mark thumbnail as uploaded and save URL
              updateBoulderField(boulder.id, 'thumbnailUploaded', true);
              updateBoulderField(boulder.id, 'uploadedThumbnailUrl', thumbnailUrl);
              await updateBoulder.mutateAsync({
                id: createdBoulder.id,
                thumbnail_url: thumbnailUrl,
              } as any);
            } catch (error: any) {
              console.error(`[BatchUpload] Thumbnail upload failed for ${boulder.name}:`, error);
              const errorMessage = error.message || 'Unbekannter Fehler';
              updateBoulderField(boulder.id, 'error', `Thumbnail-Upload fehlgeschlagen: ${errorMessage}`);
              errors.push({
                boulderName: boulder.name,
                error: errorMessage,
                type: 'thumbnail'
              });
              // Don't throw - thumbnail failure shouldn't fail the whole upload
            }
          })();
          
          uploadPromises.push(thumbnailUploadPromise);
        }

        // Wait for all uploads to complete in parallel
        // Use Promise.allSettled to handle thumbnail errors gracefully
        if (uploadPromises.length > 0) {
          try {
            // Add timeout for entire upload process (30 minutes max per boulder)
            const uploadTimeout = new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error('Upload timeout: Der Upload dauerte länger als 30 Minuten'));
              }, 30 * 60 * 1000); // 30 minutes
            });

            const results = await Promise.race([
              Promise.allSettled(uploadPromises),
              uploadTimeout,
            ]) as PromiseSettledResult<void>[];

            // Check results - video upload must succeed, thumbnail can fail
            // Results are in the same order as uploadPromises
            let videoResult: PromiseSettledResult<void> | null = null;
            let thumbnailResult: PromiseSettledResult<void> | null = null;

            if (hasVideo && hasThumbnail) {
              // Both exist: video is first, thumbnail is second
              videoResult = results[0];
              thumbnailResult = results[1];
            } else if (hasVideo) {
              // Only video
              videoResult = results[0];
            } else if (hasThumbnail) {
              // Only thumbnail
              thumbnailResult = results[0];
            }

            // If video upload failed, mark boulder as failed
            if (videoResult && videoResult.status === 'rejected') {
              throw videoResult.reason;
            }

            // Thumbnail errors are already logged, don't fail the upload
            if (thumbnailResult && thumbnailResult.status === 'rejected') {
              console.warn(`[BatchUpload] Thumbnail upload failed for ${boulder.name}, but continuing with video`);
            }

            // Update progress to 90% after uploads complete (or video completes if thumbnail failed)
            updateBoulderField(boulder.id, 'progress', 90);
          } catch (error: any) {
            // Video upload failed or timeout - already handled in promise
            console.error(`[BatchUpload] Upload failed or timed out for ${boulder.name}:`, error);
            const errorMessage = error.message || 'Unbekannter Fehler';
            updateBoulderField(boulder.id, 'error', `Upload fehlgeschlagen: ${errorMessage}`);
            updateBoulderField(boulder.id, 'status', 'failed');
            errors.push({
              boulderName: boulder.name,
              error: errorMessage,
              type: 'video'
            });
            // Continue to next boulder
            continue;
          }
        }

        updateBoulderField(boulder.id, 'currentStep', 'Fertig!');
        updateBoulderField(boulder.id, 'progress', 100);
        updateBoulderField(boulder.id, 'status', 'completed');
        
        // Remove completed boulder from list immediately (only show failed/draft boulders)
        setTimeout(() => {
          setBoulders(prev => prev.filter(b => b.id !== boulder.id));
        }, 1000); // Wait 1 second to show completion message
      } catch (error: any) {
        console.error(`[BatchUpload] Failed to create/upload ${boulder.name}:`, error);
        const errorMessage = error.message || 'Unbekannter Fehler';
        updateBoulderField(boulder.id, 'status', 'failed');
        updateBoulderField(boulder.id, 'error', errorMessage);
        errors.push({
          boulderName: boulder.name,
          error: errorMessage,
          type: 'creation'
        });
      }
    }

      // Wait a moment to show final progress in dialog
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('[BatchUpload] Fatal error during batch upload:', error);
    } finally {
      // Cleanup Service Worker listener (always cleanup, even on error)
      if (cleanupServiceWorkerListener) {
        try {
          cleanupServiceWorkerListener();
        } catch (error) {
          console.warn('[BatchUpload] Error cleaning up service worker listener:', error);
        }
      }
      
      // Release wake lock (always release, even on error)
      if (wakeLock) {
        try {
          wakeLock.release().catch(() => {});
        } catch (error) {
          console.warn('[BatchUpload] Error releasing wake lock:', error);
        }
      }
      
      setIsUploading(false);
      setCurrentUploadIndex(null);
      setUploadErrors(errors);
      
      // Dialog schließen wenn alle Uploads fertig sind
      // BUT: Don't close if there are still active uploads in the database
      // This prevents the dialog from closing when tab is switched
      if (!hasActiveUploads) {
        // Only close if we're sure there are no active uploads
        // The auto-close useEffect will handle this more gracefully
        console.log('[BatchUpload] Alle lokalen Uploads fertig, aber prüfe DB für aktive Uploads...');
        // Don't close here - let the auto-close useEffect handle it
      }
      
      // Clear completed/failed boulders from localStorage
      clearCompletedFromStorage();
      
      // Show summary
      const completed = boulders.filter(b => b.status === 'completed').length;
      const failed = boulders.filter(b => b.status === 'failed').length;
      
      if (completed > 0) {
        toast.success(`${completed} Boulder erfolgreich hochgeladen!`);
      }
      if (failed > 0) {
        toast.error(`${failed} Boulder fehlgeschlagen`);
        // Show error dialog if there are errors
        if (errors.length > 0) {
          setShowErrorDialog(true);
        }
      } else if (completed > 0) {
        // Navigate to boulders page after 2 seconds if no errors
        setTimeout(() => {
          navigate('/boulders');
        }, 2000);
      }
    }
  };

  // Calculate if there are active uploads (boulders that are uploading or have boulderId but not completed/failed)
  const hasActiveUploads = useMemo(() => {
    return boulders.some(b => 
      b.status === 'uploading' || 
      (b.boulderId && b.status !== 'completed' && b.status !== 'failed')
    );
  }, [boulders]);

  // Calculate overall progress (only for active boulders, excluding completed)
  const overallProgress = useMemo(() => {
    const activeBoulders = boulders.filter(b => b.status !== 'completed');
    if (activeBoulders.length === 0) return 0;
    const totalProgress = activeBoulders.reduce((sum, b) => sum + b.progress, 0);
    return totalProgress / activeBoulders.length;
  }, [boulders]);

  // Get current uploading boulder
  const currentBoulder = currentUploadIndex !== null ? boulders[currentUploadIndex] : null;

  // Count completed and failed
  const completedCount = boulders.filter(b => b.status === 'completed').length;
  const failedCount = boulders.filter(b => b.status === 'failed').length;
  const totalCount = boulders.length;

  // Auto-close dialog when all uploads are done
  useEffect(() => {
    if (!hasActiveUploads && showUploadDialog && !isUploading) {
      // All uploads are done, close dialog after a short delay to show completion
      const timer = setTimeout(() => {
        setShowUploadDialog(false);
        console.log('[BatchUpload] Alle Uploads fertig, Dialog automatisch geschlossen');
      }, 2000); // 2 seconds delay to show completion message
      
      return () => clearTimeout(timer);
    }
  }, [hasActiveUploads, showUploadDialog, isUploading]);

  return (
    <>
      {/* Upload Progress Dialog */}
      {/* Dialog ist jetzt schließbar, aber Upload läuft im Hintergrund weiter */}
      <Dialog 
        open={showUploadDialog} 
        onOpenChange={(open) => {
          setShowUploadDialog(open);
          // Wenn Dialog geschlossen wird und Uploads noch aktiv sind, zeigen wir den Badge
          if (!open && hasActiveUploads) {
            console.log('[BatchUpload] Dialog geschlossen, aber Upload läuft weiter im Hintergrund');
          }
          // Wenn alle Uploads fertig sind, schließen wir den Dialog automatisch
          if (!open && !hasActiveUploads) {
            console.log('[BatchUpload] Alle Uploads fertig, Dialog geschlossen');
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-w-[95vw] w-full">
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
            {overallProgress < 100 && (
              <DialogDescription className="text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-950/20 p-2 rounded text-xs">
                ℹ️ Info: Uploads laufen auch im Hintergrund weiter, wenn du den Tab wechselst oder das Display ausschaltest. Du kannst die App sicher in den Hintergrund schicken.
              </DialogDescription>
            )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowErrorDialog(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-auto p-1"
                  >
                    <span className="text-destructive">{failedCount} fehlgeschlagen</span>
                    <AlertCircle className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>

            {/* Current Boulder Progress */}
            {currentBoulder && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {currentBoulder.name || `Boulder ${(currentUploadIndex || 0) + 1}`}
                  </span>
                  <span className="font-medium">{Math.round(currentBoulder.progress)}%</span>
                </div>
                <Progress value={currentBoulder.progress} className="h-2" />
                <div className="text-xs text-muted-foreground space-y-1">
                  {currentBoulder.status === 'uploading' && (
                    <>
                      <div className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="font-medium">{currentBoulder.currentStep || 'Upload läuft...'}</span>
                      </div>
                      {currentBoulder.progress > 0 && currentBoulder.progress < 100 && (
                        <div className="text-[10px] opacity-75">
                          {currentBoulder.progress < 10 && 'Boulder wird erstellt...'}
                          {currentBoulder.progress >= 10 && currentBoulder.progress < 70 && 'Video wird hochgeladen...'}
                          {currentBoulder.progress >= 70 && currentBoulder.progress < 100 && 'Thumbnail wird hochgeladen...'}
                        </div>
                      )}
                    </>
                  )}
                  {currentBoulder.status === 'completed' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Erfolgreich hochgeladen</span>
                    </div>
                  )}
                  {currentBoulder.status === 'failed' && (
                    <div className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      <span className="truncate">Fehlgeschlagen: {currentBoulder.error?.substring(0, 50) || 'Unbekannter Fehler'}</span>
                    </div>
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

      {/* Error Dialog - Übersicht aller fehlgeschlagenen Boulder */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Upload-Fehler - Übersicht
            </DialogTitle>
            <DialogDescription>
              {boulders.filter(b => b.status === 'failed').length} Boulder konnte(n) nicht vollständig hochgeladen werden.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {boulders
              .filter(b => b.status === 'failed')
              .map((boulder) => {
                const error = uploadErrors.find(e => e.boulderName === boulder.name);
                return (
                  <div key={boulder.id} className="p-4 border-2 rounded-lg bg-destructive/5 border-destructive/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-base">{boulder.name}</span>
                          {error && (
                            <Badge variant="outline" className="text-xs">
                              {error.type === 'video' && 'Video-Fehler'}
                              {error.type === 'thumbnail' && 'Thumbnail-Fehler'}
                              {error.type === 'creation' && 'Erstellungs-Fehler'}
                            </Badge>
                          )}
                        </div>
                        <div className="bg-destructive/10 border border-destructive/20 rounded p-3 mb-3">
                          <p className="text-sm font-medium text-destructive mb-1">Fehlermeldung:</p>
                          <p className="text-sm text-destructive/90 break-words whitespace-pre-wrap">
                            {boulder.error || error?.error || 'Unbekannter Fehler'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowErrorDialog(false);
                            retryBoulderUpload(boulder.id);
                          }}
                          disabled={isUploading}
                          className="w-full sm:w-auto"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Erneut versuchen
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
            <Button
              variant="default"
              onClick={async () => {
                setShowErrorDialog(false);
                // Retry all failed boulders sequentially
                const failedBoulders = boulders.filter(b => b.status === 'failed');
                if (failedBoulders.length > 0) {
                  setIsUploading(true);
                  let successCount = 0;
                  let failCount = 0;
                  
                  for (const boulder of failedBoulders) {
                    try {
                      await retryBoulderUpload(boulder.id);
                      successCount++;
                      // Small delay between retries to avoid overwhelming the server
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                      failCount++;
                      console.error(`[BatchUpload] Failed to retry ${boulder.name}:`, error);
                    }
                  }
                  
                  setIsUploading(false);
                  
                  if (successCount > 0) {
                    toast.success(`${successCount} Boulder erfolgreich erneut hochgeladen!`);
                  }
                  if (failCount > 0) {
                    toast.error(`${failCount} Boulder sind erneut fehlgeschlagen`);
                    // Show dialog again if there are still failures
                    if (boulders.filter(b => b.status === 'failed').length > 0) {
                      setTimeout(() => setShowErrorDialog(true), 500);
                    }
                  }
                }
              }}
              disabled={isUploading || boulders.filter(b => b.status === 'failed').length === 0}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Alle erneut versuchen ({boulders.filter(b => b.status === 'failed').length})
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowErrorDialog(false);
                }}
              >
                Schließen
              </Button>
              <Button
                onClick={() => {
                  setShowErrorDialog(false);
                  navigate('/boulders');
                }}
              >
                Zu Boulder-Übersicht
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full min-w-0 max-w-full overflow-hidden">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="text-lg sm:text-xl">Batch-Upload</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Minimierter Progress-Badge: Zeigt wenn Upload aktiv aber Dialog geschlossen */}
            {hasActiveUploads && !showUploadDialog && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowUploadDialog(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                <span className="truncate">
                  Upload läuft ({Math.round(overallProgress)}%)
                </span>
              </Button>
            )}
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
        {(() => {
          const activeBoulders = boulders.filter(b => b.status !== 'completed');
          return activeBoulders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">Noch keine Boulder hinzugefügt</p>
              <Button onClick={addBoulder} variant="outline">
                <PlusCircle className="w-4 h-4 mr-2" />
                Ersten Boulder hinzufügen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeBoulders.map((boulder, index) => {
              // Reverse numbering: first boulder (index 0) is at bottom, newest at top
              const displayNumber = activeBoulders.length - index;
              return (
              <Card key={boulder.id} className="border-2 w-full min-w-0 max-w-full overflow-hidden">
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg truncate min-w-0">Boulder {displayNumber}</CardTitle>
                      {boulder.isRestored && (
                        <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                          Wiederhergestellt
                        </Badge>
                      )}
                    </div>
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
                    <div className="mt-2 space-y-1">
                      <Progress value={boulder.progress} className="h-2" />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{Math.round(boulder.progress)}%</p>
                        {boulder.currentStep && (
                          <p className="text-xs text-muted-foreground font-medium truncate ml-2">{boulder.currentStep}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {boulder.error && (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-destructive mb-1">Fehler:</p>
                          <p className="text-sm text-destructive/90 break-words">{boulder.error}</p>
                        </div>
                      </div>
                      {boulder.status === 'failed' && (
                        <div className="mt-3 pt-3 border-t border-destructive/20">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryBoulderUpload(boulder.id)}
                            disabled={isUploading}
                            className="w-full sm:w-auto"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Erneut versuchen
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 px-2 sm:px-6">
                  {/* Thumbnail first */}
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

                  {/* Video second */}
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

                  {/* Text inputs after video */}
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
                        onValueChange={(value) => {
                          updateBoulderField(boulder.id, 'sector_id', value);
                          // Reset sector_id_2 if it's the same as the new sector_id
                          if (boulder.sector_id_2 === value) {
                            updateBoulderField(boulder.id, 'sector_id_2', null);
                          }
                        }}
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
                    <div className="w-full min-w-0 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`spans-multiple-sectors-${boulder.id}`}
                          checked={boulder.spansMultipleSectors}
                          onCheckedChange={(checked) => {
                            updateBoulderField(boulder.id, 'spansMultipleSectors', checked);
                            if (!checked) {
                              updateBoulderField(boulder.id, 'sector_id_2', null);
                            }
                          }}
                          disabled={isUploading || !boulder.sector_id}
                        />
                        <Label htmlFor={`spans-multiple-sectors-${boulder.id}`} className="cursor-pointer text-sm">
                          Verläuft über mehrere Sektoren
                        </Label>
                      </div>
                      {boulder.spansMultipleSectors && (
                        <div className="w-full min-w-0">
                          <Label htmlFor={`sector-2-${boulder.id}`}>Endet in Sektor</Label>
                          <Select
                            value={boulder.sector_id_2 || ''}
                            onValueChange={(value) => updateBoulderField(boulder.id, 'sector_id_2', value)}
                            disabled={isUploading || !boulder.sector_id}
                          >
                            <SelectTrigger id={`sector-2-${boulder.id}`} className="w-full min-w-0">
                              <SelectValue placeholder="Sektor wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {sectors?.filter(s => s.id !== boulder.sector_id).map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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
                          <SelectValue className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border flex-shrink-0" 
                                style={getColorBackgroundStyle(boulder.color, colorsDb || undefined)}
                              />
                              <span>{boulder.color}</span>
                            </div>
                          </SelectValue>
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
                </CardContent>
              </Card>
              );
            })}
            </div>
          );
        })()}
      </CardContent>
    </Card>
    </>
  );
};

