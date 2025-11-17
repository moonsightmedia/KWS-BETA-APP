import { useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { useNavigate } from 'react-router-dom';
import { useSectorsTransformed, useUpdateSector } from '@/hooks/useSectors';
import { useBouldersWithSectors, useCreateBoulder, useUpdateBoulder, useBulkUpdateBoulderStatus, useDeleteBoulder, useCdnVideos } from '@/hooks/useBoulders';
import { uploadBetaVideo, uploadThumbnail } from '@/integrations/supabase/storage';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Edit3, Calendar, X, Sparkles, ChevronLeft, ChevronRight, Check, Video, FileText } from 'lucide-react';
import { MaterialIcon } from '@/components/MaterialIcon';
import { useMemo as useMemoReact, useRef, useState } from 'react';
import { useSectorSchedule, useCreateSectorSchedule, useDeleteSectorSchedule } from '@/hooks/useSectorSchedule';
import { useColors } from '@/hooks/useColors';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { UploadLogViewer } from '@/components/admin/UploadLogViewer';

const DIFFICULTIES = [null, 1, 2, 3, 4, 5, 6, 7, 8]; // null = "?" (unknown/not rated)

// Helper function to format difficulty for display
const formatDifficulty = (d: number | null): string => d === null ? '?' : String(d);
// Helper function to parse difficulty from string
const parseDifficulty = (value: string): number | null => value === '?' || value === 'null' ? null : parseInt(value, 10);

const DEFAULT_COLORS = ['Grün','Gelb','Blau','Orange','Rot','Schwarz','Weiß','Lila'];
const DEFAULT_COLOR_HEX: Record<string, string> = {
  'Grün': '#22c55e',
  'Gelb': '#facc15',
  'Blau': '#3b82f6',
  'Orange': '#f97316',
  'Rot': '#ef4444',
  'Schwarz': '#111827',
  'Weiß': '#ffffff',
  'Lila': '#a855f7',
};
function getTextClassForHex(hex?: string): string {
  if (!hex) return 'text-white';
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
  return luminance > 0.6 ? 'text-black' : 'text-white';
}

// Enhanced creative Boulder name generator
const COLOR_ADJECTIVES: Record<string, string> = {
  'Grün': 'Grüner',
  'Gelb': 'Gelber',
  'Blau': 'Blauer',
  'Orange': 'Oranger',
  'Rot': 'Roter',
  'Schwarz': 'Schwarzer',
  'Weiß': 'Weißer',
  'Lila': 'Lilaner',
};

// Extensive adjective collection for creative names
const NAME_ADJECTIVES: string[] = [
  // Nature & Elements
  'Wilder', 'Stiller', 'Flinker', 'Mutiger', 'Frecher', 'Geheimer', 'Schneller', 'Kleiner', 'Großer', 'Felsiger',
  'Sanfter', 'Kniffliger', 'Starker', 'Leichter', 'Zäher', 'Kühner', 'Wackerer', 'Frischer', 'Neuer', 'Alter',
  'Steinerner', 'Eisiger', 'Feuriger', 'Windiger', 'Erdiger', 'Wässriger', 'Stürmischer', 'Ruhiger',
  // Character & Personality
  'Listiger', 'Kühler', 'Heißer', 'Bitterer', 'Süßer', 'Saurer', 'Scharfer', 'Milder', 'Rauer', 'Glatter',
  'Scharfer', 'Dumpfer', 'Heller', 'Dunkler', 'Klarer', 'Trüber', 'Reiner', 'Schmutziger',
  // Movement & Action
  'Sprungfreudiger', 'Kletternder', 'Gleitender', 'Fallender', 'Steigender', 'Kriechender', 'Fliegender',
  'Schwebender', 'Tanzender', 'Schwingender', 'Wippender', 'Schaukelnder',
  // Abstract & Mystical
  'Mystischer', 'Magischer', 'Geheimnisvoller', 'Rätselhafter', 'Unerklärlicher', 'Unbekannter', 'Versteckter',
  'Vergessener', 'Verlorener', 'Gefundener', 'Entdeckter', 'Erfundener',
];

// Extensive noun collection - animals, nature, objects, abstract
const NAME_NOUNS: string[] = [
  // Animals
  'Gecko', 'Phantom', 'Panther', 'Meteor', 'Kolibri', 'Specht', 'Saturn', 'Drache', 'Komet', 'Puma',
  'Goblin', 'Adler', 'Wal', 'Berserker', 'Nebel', 'Fuchs', 'Wolf', 'Rätsel', 'Rücken', 'Block',
  'Löwe', 'Tiger', 'Bär', 'Eule', 'Falke', 'Hai', 'Schlange', 'Skorpion', 'Spinne', 'Biene',
  'Schmetterling', 'Libelle', 'Grashüpfer', 'Ameise', 'Käfer', 'Schnecke', 'Wurm', 'Fisch', 'Frosch',
  'Eichhörnchen', 'Hase', 'Igel', 'Dachs', 'Marder', 'Luchs', 'Wildkatze', 'Jaguar', 'Leopard', 'Gepard',
  // Nature & Elements
  'Fels', 'Stein', 'Klippe', 'Wand', 'Grat', 'Spitze', 'Gipfel', 'Abgrund', 'Schlucht', 'Canyon',
  'Welle', 'Strom', 'Fluss', 'Wasserfall', 'Quelle', 'See', 'Meer', 'Ozean', 'Gischt', 'Schaum',
  'Wind', 'Sturm', 'Böe', 'Luft', 'Atem', 'Hauch', 'Brise', 'Wirbel', 'Tornado', 'Hurrikan',
  'Feuer', 'Flamme', 'Funke', 'Glut', 'Asche', 'Rauch', 'Brand', 'Inferno', 'Lavastrom',
  'Eis', 'Frost', 'Schnee', 'Hagel', 'Eiszapfen', 'Gletscher', 'Eisberg', 'Polareis',
  // Objects & Tools
  'Anker', 'Kette', 'Seil', 'Knoten', 'Haken', 'Nagel', 'Schraube', 'Bolzen', 'Dübel', 'Klammer',
  'Hammer', 'Meißel', 'Axt', 'Säge', 'Messer', 'Klinge', 'Schwert', 'Dolch', 'Speer', 'Pfeil',
  'Schild', 'Rüstung', 'Helm', 'Panzer', 'Mauer', 'Turm', 'Burg', 'Festung', 'Bastion',
  // Abstract & Mystical
  'Geist', 'Seele', 'Kraft', 'Energie', 'Macht', 'Stärke', 'Schwäche', 'Mut', 'Angst', 'Hoffnung',
  'Traum', 'Vision', 'Illusion', 'Täuschung', 'Wahrheit', 'Lüge', 'Geheimnis', 'Rätsel', 'Mysterium',
  'Schatten', 'Licht', 'Dunkelheit', 'Helligkeit', 'Glanz', 'Schimmer', 'Funkeln', 'Leuchten',
  'Echo', 'Klang', 'Ton', 'Melodie', 'Rhythmus', 'Takt', 'Harmonie', 'Dissonanz',
  // Celestial & Space
  'Stern', 'Planet', 'Mond', 'Sonne', 'Galaxie', 'Nebel', 'Komet', 'Asteroid', 'Meteorit',
  'Orion', 'Sirius', 'Polaris', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptun',
  // Mythical & Fantasy
  'Phoenix', 'Gryphon', 'Pegasus', 'Einhorn', 'Basilisk', 'Hydra', 'Kraken', 'Leviathan',
  'Valkyrie', 'Vampir', 'Werwolf', 'Zombie', 'Skelett', 'Ghul', 'Dämon', 'Engel', 'Dämon',
  'Zauberer', 'Hexe', 'Magier', 'Alchemist', 'Nekromant', 'Druide', 'Schamane', 'Priester',
  // Action & Movement
  'Sprung', 'Satz', 'Hüpfer', 'Flug', 'Sturz', 'Fall', 'Aufstieg', 'Abstieg', 'Kletterei',
  'Balance', 'Gleichgewicht', 'Stabilität', 'Instabilität', 'Schwung', 'Impuls', 'Momentum',
];

// Difficulty-based name modifiers for more context-aware names
const DIFFICULTY_MODIFIERS: Record<number, string[]> = {
  1: ['Leichter', 'Sanfter', 'Einfacher', 'Milder', 'Zarter', 'Weicher'],
  2: ['Angenehmer', 'Komfortabler', 'Entspannte', 'Ruhige', 'Gelassene'],
  3: ['Mittlere', 'Ausgewogene', 'Stabile', 'Solide', 'Zuverlässige'],
  4: ['Herausfordernde', 'Anspruchsvolle', 'Interessante', 'Spannende'],
  5: ['Schwierige', 'Knifflige', 'Trickreiche', 'Komplexe', 'Verschlungene'],
  6: ['Harte', 'Robuste', 'Widerstandsfähige', 'Zähe', 'Hartnäckige'],
  7: ['Extreme', 'Brutale', 'Gnadenlose', 'Unerbittliche', 'Mörderische'],
  8: ['Legendäre', 'Mythische', 'Epische', 'Ultimative', 'Unmögliche', 'Unvorstellbare'],
};

function toColorAdjective(color: string): string {
  return COLOR_ADJECTIVES[color] || '';
}

function getRandom<T>(arr: T[]): T { 
  return arr[Math.floor(Math.random() * arr.length)]; 
}

function generateBoulderName(color: string, difficulty: number | null): string {
  const parts: string[] = [];
  const patterns = [
    // Pattern 1: Color + Adjective + Noun (classic)
    () => {
      const colorAdj = toColorAdjective(color);
      if (colorAdj) parts.push(colorAdj);
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 2: Difficulty modifier + Noun
    () => {
      const modifiers = DIFFICULTY_MODIFIERS[difficulty] || [];
      if (modifiers.length > 0 && Math.random() > 0.5) {
        parts.push(getRandom(modifiers));
      }
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 3: Adjective + Noun (no color)
    () => {
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 4: Color + Noun (simpler)
    () => {
      const colorAdj = toColorAdjective(color);
      if (colorAdj) parts.push(colorAdj);
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 5: Double adjective + Noun
    () => {
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_NOUNS));
    },
  ];
  
  // Randomly select a pattern
  const selectedPattern = getRandom(patterns);
  selectedPattern();
  
  return parts.join(' ');
}

// If the current name starts with a color adjective, replace it when color changes
function adjustNameForColor(name: string, newColor: string): string {
  if (!name) return name;
  const adjs = Object.values(COLOR_ADJECTIVES);
  const pattern = new RegExp(`^(${adjs.join('|')})\\b`);
  if (!pattern.test(name)) return name;
  const newAdj = toColorAdjective(newColor);
  if (!newAdj) return name;
  return name.replace(pattern, newAdj);
}

// Component to visually select a video from CDN
const VideoSelector = ({ 
  selectedUrl, 
  onSelect
}: { 
  selectedUrl: string; 
  onSelect: (url: string) => void;
}) => {
  // Get all unique CDN video URLs directly from database
  const { data: cdnVideos = [], isLoading } = useCdnVideos();

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Lade Videos...</p>
      </div>
    );
  }

  if (cdnVideos.length === 0 && !showManualInput) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Keine Videos im CDN gefunden. Du kannst manuell eine URL eingeben.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowManualInput(true)}
          className="w-full"
        >
          URL manuell eingeben
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cdnVideos.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Verfügbare Videos im CDN ({cdnVideos.length})
          </p>
          <ScrollArea className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
              {cdnVideos.map((videoUrl) => {
                const isSelected = selectedUrl === videoUrl;
                return (
                  <button
                    key={videoUrl}
                    type="button"
                    onClick={() => onSelect(videoUrl)}
                    className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary ring-offset-2' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <video
                      src={videoUrl}
                      className="w-full h-full object-cover pointer-events-none"
                      preload="metadata"
                      muted
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {showManualInput || cdnVideos.length > 0 ? (
        <div className="space-y-2">
          {cdnVideos.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">oder</span>
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="video-url-manual" className="text-xs mb-1 block">
              URL manuell eingeben
            </Label>
            <div className="flex gap-2">
              <Input
                id="video-url-manual"
                type="url"
                placeholder="https://cdn.kletterwelt-sauerland.de/uploads/..."
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualUrl) {
                    onSelect(manualUrl);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (manualUrl) {
                    onSelect(manualUrl);
                    setManualUrl('');
                  }
                }}
                disabled={!manualUrl}
              >
                Übernehmen
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Setter = () => {
  const { session } = useAuth();
  const { hasRole: isSetter, loading: loadingSetter } = useHasRole('setter');
  const { hasRole: isAdmin, loading: loadingAdmin } = useHasRole('admin');
  const navigate = useNavigate();
  const { data: sectors } = useSectorsTransformed();
  const { data: boulders } = useBouldersWithSectors();
  const createBoulder = useCreateBoulder();
  const updateBoulder = useUpdateBoulder();
  const deleteBoulder = useDeleteBoulder();
  const updateSector = useUpdateSector();
  const bulkStatus = useBulkUpdateBoulderStatus();

  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  const isLoadingRoles = loadingSetter || loadingAdmin;
  const canAccess = isSetter || isAdmin;

  const [form, setForm] = useState({
    name: '',
    sector_id: '',
    spansMultipleSectors: false,
    sector_id_2: '',
    difficulty: 1,
    color: 'Grün',
    note: '',
    file: null as File | null,
    thumbnailFile: null as File | null,
    videoUrl: '' as string, // For CDN video selection
  });
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<'create' | 'edit' | 'schedule' | 'status' | 'logs'>('create');
  // Wizard state for multi-step boulder creation
  const [wizardStep, setWizardStep] = useState(1);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [editSearch, setEditSearch] = useState('');
  const [editSector, setEditSector] = useState<string>('all');
  const [editDifficulty, setEditDifficulty] = useState<string>('all');
  const [editColor, setEditColor] = useState<string>('all');
  const [editing, setEditing] = useState<any | null>(null);
  const [scheduleSectorId, setScheduleSectorId] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const { data: schedule } = useSectorSchedule();
  const createSchedule = useCreateSectorSchedule();
  const deleteSchedule = useDeleteSectorSchedule();
  const [statusFilter, setStatusFilter] = useState<'all' | 'haengt' | 'abgeschraubt'>('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const { data: colorsDb } = useColors();
  const COLORS = useMemo(() => (colorsDb && colorsDb.length>0 ? colorsDb.map(c=>c.name) : DEFAULT_COLORS), [colorsDb]);
  const COLOR_HEX: Record<string, string> = useMemo(() => {
    if (colorsDb && colorsDb.length>0) {
      const map: Record<string, string> = {};
      colorsDb.forEach(c => { map[c.name] = c.hex; });
      return map;
    }
    return DEFAULT_COLOR_HEX;
  }, [colorsDb]);
  const TEXT_ON_COLOR: Record<string, string> = useMemo(() => {
    const map: Record<string,string> = {};
    (COLORS || []).forEach(name => { map[name] = getTextClassForHex(COLOR_HEX[name]); });
    return map;
  }, [COLORS, COLOR_HEX]);

  const canSubmit = useMemo(() => {
    return !!form.name && !!form.sector_id && (form.difficulty === null || (form.difficulty >= 1 && form.difficulty <= 8));
  }, [form]);

  // Wizard validation helpers
  const canProceedStep1 = useMemo(() => {
    return !!form.name && !!form.sector_id;
  }, [form.name, form.sector_id]);

  const canProceedStep2 = useMemo(() => {
    return !!form.file || !!form.videoUrl;
  }, [form.file, form.videoUrl]);

  const canProceedStep3 = useMemo(() => {
    return true; // Thumbnail is optional
  }, []);

  const canProceedStep4 = useMemo(() => {
    return (form.difficulty === null || (form.difficulty >= 1 && form.difficulty <= 8)) && !!form.color;
  }, [form.difficulty, form.color]);

  // Helper to create preview URLs
  useEffect(() => {
    if (form.file) {
      const url = URL.createObjectURL(form.file);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (form.videoUrl) {
      setVideoPreviewUrl(form.videoUrl);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [form.file, form.videoUrl]);

  useEffect(() => {
    if (form.thumbnailFile) {
      const url = URL.createObjectURL(form.thumbnailFile);
      setThumbnailPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setThumbnailPreviewUrl(null);
    }
  }, [form.thumbnailFile]);

  // Reset wizard when switching views
  useEffect(() => {
    if (view !== 'create') {
      setWizardStep(1);
      setVideoPreviewUrl(null);
      setThumbnailPreviewUrl(null);
    }
  }, [view]);

  // Wizard submit function (called at step 5)
  const onWizardSubmit = async () => {
    if (!canSubmit || !canAccess) return;
    try {
      setIsUploading(true);
      
      // Create boulder immediately (without video URL if file exists, but with CDN URL if provided)
      const boulderData = {
        name: form.name,
        sector_id: form.sector_id,
        sector_id_2: form.spansMultipleSectors && form.sector_id_2 ? form.sector_id_2 : null,
        difficulty: form.difficulty,
        color: form.color,
        beta_video_url: form.videoUrl || (form.file ? null : null), // Use CDN URL if provided, otherwise null if file exists (will be updated)
        thumbnail_url: form.thumbnailFile ? null : null, // Will be updated after upload
        note: form.note,
      };
      
      const createdBoulder = await createBoulder.mutateAsync(boulderData as any);
      
      // Upload video and thumbnail in parallel if they exist
      const uploadPromises: Promise<void>[] = [];
      
      if (form.file && createdBoulder?.id) {
        uploadPromises.push(
          uploadBetaVideo(form.file, (progress) => {
            // Progress handling can be added here if needed
          }, createdBoulder.id).then((betaUrl) => {
            return updateBoulder.mutateAsync({
              id: createdBoulder.id,
              beta_video_url: betaUrl,
            } as any).then(() => {
              toast.success('Video erfolgreich hochgeladen!');
            }).catch((error) => {
              console.error('[Setter] Failed to update boulder with video URL:', error);
              toast.error('Video hochgeladen, aber Boulder konnte nicht aktualisiert werden');
            });
          }).catch((error) => {
            console.error('[Setter] Video upload failed:', error);
            toast.error('Fehler beim Hochladen des Videos');
          })
        );
      }
      
      if (form.thumbnailFile && createdBoulder?.id) {
        uploadPromises.push(
          uploadThumbnail(form.thumbnailFile, (progress) => {
            // Progress handling can be added here if needed
          }, createdBoulder.id).then((thumbnailUrl) => {
            return updateBoulder.mutateAsync({
              id: createdBoulder.id,
              thumbnail_url: thumbnailUrl,
            } as any).then(() => {
              toast.success('Thumbnail erfolgreich hochgeladen!');
            }).catch((error) => {
              console.error('[Setter] Failed to update boulder with thumbnail URL:', error);
              toast.error('Thumbnail hochgeladen, aber Boulder konnte nicht aktualisiert werden');
            });
          }).catch((error) => {
            console.error('[Setter] Thumbnail upload failed:', error);
            toast.error('Fehler beim Hochladen des Thumbnails');
          })
        );
      }
      
      // Wait for all uploads to complete
      await Promise.allSettled(uploadPromises);
      
      setForm({ name: '', sector_id: '', spansMultipleSectors: false, sector_id_2: '', difficulty: 1, color: 'Grün', note: '', file: null, thumbnailFile: null, videoUrl: '' });
      setWizardStep(1);
      setVideoPreviewUrl(null);
      setThumbnailPreviewUrl(null);
      navigate('/boulders');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Fehler beim Erstellen', {
        description: error.message || 'Unbekannter Fehler',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !canAccess) return;
    try {
      setIsUploading(true);
      
      // Create boulder immediately (without video URL if file exists)
      const boulderData = {
        name: form.name,
        sector_id: form.sector_id,
        sector_id_2: form.spansMultipleSectors && form.sector_id_2 ? form.sector_id_2 : null,
        difficulty: form.difficulty,
        color: form.color,
        beta_video_url: form.file ? null : null, // Will be updated after upload
        note: form.note,
      };
      
      const createdBoulder = await createBoulder.mutateAsync(boulderData as any);
      
      // If there's a file, upload it in the background and update the boulder
      if (form.file && createdBoulder?.id) {
        // Show upload progress toast with custom progress bar
        let currentProgress = 0;
        const toastId = toast.custom((t) => (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Video wird hochgeladen...</span>
              <span className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>
        ), {
          duration: Infinity, // Keep toast open until we dismiss it
        });
        
        // Upload video in background (don't await - let it run async)
        uploadBetaVideo(form.file, (progress) => {
          currentProgress = progress;
          // Update toast with new progress
          toast.custom((t) => (
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Video wird hochgeladen...</span>
                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ), {
            id: toastId,
            duration: Infinity,
          });
        }, createdBoulder.id).then((betaUrl) => {
          // Update boulder with video URL after upload completes
          updateBoulder.mutateAsync({
            id: createdBoulder.id,
            beta_video_url: betaUrl,
          } as any).then(() => {
            // Update toast to success and auto-dismiss after 3 seconds
            toast.success('Video erfolgreich hochgeladen!', {
              id: toastId,
              duration: 3000, // Auto-dismiss after 3 seconds
            });
          }).catch((error) => {
            console.error('[Setter] Failed to update boulder with video URL:', error);
            toast.error('Video hochgeladen, aber Boulder konnte nicht aktualisiert werden', {
              id: toastId,
              description: error.message,
              duration: 5000,
            });
          });
        }).catch((error) => {
          console.error('[Setter] Video upload failed:', error);
          toast.error('Fehler beim Hochladen des Videos', {
            id: toastId,
            description: error.message || 'Unbekannter Fehler',
            duration: 5000, // Auto-dismiss after 5 seconds
          });
        });
      }
      
      setForm({ name: '', sector_id: '', spansMultipleSectors: false, sector_id_2: '', difficulty: 1, color: 'Grün', note: '', file: null, thumbnailFile: null, videoUrl: '' });
      setWizardStep(1);
      setVideoPreviewUrl(null);
      setThumbnailPreviewUrl(null);
      navigate('/boulders');
    } catch (error: any) {
      // Dismiss any existing upload toast on error
      toast.dismiss();
      toast.error('Fehler beim Erstellen', {
        description: error.message || 'Unbekannter Fehler',
        duration: 5000, // Auto-dismiss after 5 seconds
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredBoulders = useMemo(() => {
    let list = boulders || [];
    if (editSector !== 'all') {
      const selectedSectorName = sectors?.find(s => s.id === editSector)?.name;
      // Filter: Boulder erscheint, wenn er in einem der beiden Sektoren ist
      list = list.filter(b => {
        const inSector1 = b.sector === selectedSectorName;
        const inSector2 = b.sector2 === selectedSectorName;
        return inSector1 || inSector2;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((b:any) => (b as any).status === statusFilter);
    }
    if (editDifficulty !== 'all') {
      list = list.filter(b => {
        const bDifficulty = b.difficulty === null ? '?' : String(b.difficulty);
        return bDifficulty === editDifficulty;
      });
    }
    if (editColor !== 'all') {
      list = list.filter(b => b.color === editColor);
    }
    if (editSearch.trim()) {
      const q = editSearch.toLowerCase();
      list = list.filter(b => {
        const sectorText = b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector;
        return b.name.toLowerCase().includes(q) || sectorText.toLowerCase().includes(q);
      });
    }
    return list.slice(0, 100);
  }, [boulders, editSector, editDifficulty, editColor, editSearch, sectors]);

  const startEdit = (b: any) => {
    console.log('[Setter] startEdit called with boulder:', b.name, 'thumbnailUrl:', b.thumbnailUrl);
    setEditing(b);
    setView('edit');
    setWizardStep(1); // Reset wizard to step 1 for editing
    // map into form-like state
    const sector1Id = sectors?.find(s => s.name === b.sector)?.id || '';
    const sector2Id = b.sector2 ? sectors?.find(s => s.name === b.sector2)?.id || '' : '';
    setForm({
      name: b.name,
      sector_id: sector1Id,
      spansMultipleSectors: !!b.sector2,
      sector_id_2: sector2Id,
      difficulty: b.difficulty,
      color: b.color,
      note: b.note || '',
      file: null,
      thumbnailFile: null,
      videoUrl: b.betaVideoUrl || '', // Set existing video URL if available
    });
    // Set preview URLs if boulder has existing video/thumbnail
    if (b.betaVideoUrl) {
      setVideoPreviewUrl(b.betaVideoUrl);
    } else {
      setVideoPreviewUrl(null);
    }
    if (b.thumbnailUrl) {
      // Fix old URLs that incorrectly include /videos/ in the path
      let thumbnailUrl = b.thumbnailUrl;
      if (thumbnailUrl.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
        thumbnailUrl = thumbnailUrl.replace('/uploads/videos/', '/uploads/');
        console.log('[Setter] Fixed thumbnail URL:', b.thumbnailUrl, '→', thumbnailUrl);
      }
      setThumbnailPreviewUrl(thumbnailUrl);
      console.log('[Setter] Set thumbnail preview URL:', thumbnailUrl);
    } else {
      setThumbnailPreviewUrl(null);
      console.log('[Setter] No thumbnail URL found for boulder:', b.name);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsUploading(true);
    try {
      // Update boulder immediately (without video/thumbnail URLs if new files exist)
      const updateData = {
        id: editing.id,
        name: form.name,
        sector_id: form.sector_id,
        sector_id_2: form.spansMultipleSectors && form.sector_id_2 ? form.sector_id_2 : null,
        difficulty: form.difficulty,
        color: form.color,
        beta_video_url: form.file ? null : editing.betaVideoUrl || null, // Will be updated after upload
        thumbnail_url: form.thumbnailFile ? null : editing.thumbnailUrl || null, // Will be updated after upload
        note: form.note,
      };
      
      await updateBoulder.mutateAsync(updateData as any);
      
      // Upload video and thumbnail in parallel if they exist
      const uploadPromises: Promise<void>[] = [];
      
      // If there's a new video file, upload it in the background and update the boulder
      if (form.file) {
        // Delete old video before uploading new one
        const oldVideoUrl = editing.betaVideoUrl;
        if (oldVideoUrl) {
          console.log('[Setter] Deleting old video before uploading new one:', oldVideoUrl);
          try {
            const { deleteBetaVideo } = await import('@/integrations/supabase/storage');
            await deleteBetaVideo(oldVideoUrl);
            console.log('[Setter] Old video deleted successfully');
          } catch (error) {
            console.error('[Setter] Error deleting old video (continuing anyway):', error);
            // Continue with upload even if deletion fails
          }
        }
        
        uploadPromises.push(
          uploadBetaVideo(form.file, (progress) => {
            // Progress handling can be added here if needed
          }, editing.id).then((betaUrl) => {
            return updateBoulder.mutateAsync({
              id: editing.id,
              beta_video_url: betaUrl,
            } as any).then(() => {
              toast.success('Video erfolgreich hochgeladen!');
            }).catch((error) => {
              console.error('[Setter] Failed to update boulder with video URL:', error);
              toast.error('Video hochgeladen, aber Boulder konnte nicht aktualisiert werden');
            });
          }).catch((error) => {
            console.error('[Setter] Video upload failed:', error);
            toast.error('Fehler beim Hochladen des Videos');
          })
        );
      }
      
      // If there's a new thumbnail file, upload it in the background and update the boulder
      if (form.thumbnailFile) {
        // Delete old thumbnail before uploading new one
        const oldThumbnailUrl = editing.thumbnailUrl;
        if (oldThumbnailUrl) {
          console.log('[Setter] Deleting old thumbnail before uploading new one:', oldThumbnailUrl);
          try {
            const { deleteThumbnail } = await import('@/integrations/supabase/storage');
            await deleteThumbnail(oldThumbnailUrl);
            console.log('[Setter] Old thumbnail deleted successfully');
          } catch (error) {
            console.error('[Setter] Error deleting old thumbnail (continuing anyway):', error);
            // Continue with upload even if deletion fails
          }
        }
        
        uploadPromises.push(
          uploadThumbnail(form.thumbnailFile, (progress) => {
            // Progress handling can be added here if needed
          }, editing.id).then((thumbnailUrl) => {
            return updateBoulder.mutateAsync({
              id: editing.id,
              thumbnail_url: thumbnailUrl,
            } as any).then(() => {
              toast.success('Thumbnail erfolgreich hochgeladen!');
            }).catch((error) => {
              console.error('[Setter] Failed to update boulder with thumbnail URL:', error);
              toast.error('Thumbnail hochgeladen, aber Boulder konnte nicht aktualisiert werden');
            });
          }).catch((error) => {
            console.error('[Setter] Thumbnail upload failed:', error);
            toast.error('Fehler beim Hochladen des Thumbnails');
          })
        );
      }
      
      // Wait for all uploads to complete
      await Promise.allSettled(uploadPromises);
      
      setEditing(null);
      setVideoPreviewUrl(null);
      setThumbnailPreviewUrl(null);
    } catch (error: any) {
      // Dismiss any existing upload toast on error
      toast.dismiss();
      toast.error('Fehler beim Aktualisieren', {
        description: error.message || 'Unbekannter Fehler',
        duration: 5000, // Auto-dismiss after 5 seconds
      });
    } finally {
      setIsUploading(false);
    }
  };

  const scheduleNextSector = async () => {
    if (!scheduleSectorId || !scheduleDate) return;
    await createSchedule.mutateAsync({ sector_id: scheduleSectorId, scheduled_at: scheduleDate, note: null } as any);
    setScheduleSectorId('');
    setScheduleDate('');
  };

  const weeks = useMemoReact(() => {
    const start = new Date();
    start.setHours(0,0,0,0);
    const day = start.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday as start
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 6 }).map((_, w) => {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + w * 7);
      const days = Array.from({ length: 7 }).map((__, d) => {
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate() + d);
        return dt;
      });
      return { weekStart, days };
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const selectAll = (ids: string[], value: boolean) => {
    const next: Record<string, boolean> = { ...selected };
    ids.forEach(id => { next[id] = value; });
    setSelected(next);
  };

  const selectedCount = useMemo(() => {
    return (boulders || []).filter(b => selected[(b as any).id]).length;
  }, [boulders, selected]);

  // Warte, bis die Rollen geladen sind, bevor wir "Zugriff verweigert" anzeigen
  if (isLoadingRoles) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Du benötigst die Rolle Setter oder Admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <Sidebar hideMobileNav={view==='status' && selectedCount>0} />
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0 overflow-x-hidden w-full min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-8 w-full min-w-0 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 font-teko tracking-wide">Setter</h1>
            <p className="text-muted-foreground">Boulder anlegen und bearbeiten. Nächsten Sektor planen.</p>
          </div>
          {/* Segmented top control for Setter views */}
          {!(view==='status' && selectedCount>0) && (
            <div className="sticky top-[56px] md:top-[88px] z-30 px-3 md:px-4 mb-3 w-full max-w-full overflow-x-hidden">
              <nav className="bg-sidebar-bg rounded-2xl shadow-2xl border border-border w-full max-w-full">
                <div className="w-full flex items-center justify-around px-2 py-2 min-w-0">
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-xl transition-all flex-shrink-0 ${view==='create' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('create')}
                  >
                    <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap">Hinzufügen</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-xl transition-all flex-shrink-0 ${view==='edit' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('edit')}
                  >
                    <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap">Bearbeiten</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-xl transition-all flex-shrink-0 ${view==='status' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('status')}
                  >
                    <MaterialIcon name="build" className="w-4 h-4 sm:w-5 sm:h-5" size={20} />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap">Status</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-xl transition-all flex-shrink-0 ${view==='schedule' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('schedule')}
                  >
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap">Schraubtermin</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-xl transition-all flex-shrink-0 ${view==='logs' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('logs')}
                  >
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs whitespace-nowrap">Upload-Logs</span>
                  </button>
                </div>
              </nav>
            </div>
          )}
          <div className="grid grid-cols-1 md:gap-8 max-w-7xl mx-auto w-full min-w-0">
            <section className="w-full min-w-0">
        {view === 'create' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Neuen Boulder anlegen</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Schritt {wizardStep} von 5</span>
                  </div>
                </div>
                {/* Progress indicator */}
                <div className="mt-4 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div key={step} className="flex-1 flex items-center">
                      <div className={`flex-1 h-1 rounded-full ${step <= wizardStep ? 'bg-primary' : 'bg-muted'}`} />
                      {step < 5 && (
                        <div className={`w-1 h-1 rounded-full mx-1 ${step < wizardStep ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {/* Step 1: Name & Sektor */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="w-full min-w-0">
                      <Label htmlFor="name">Name *</Label>
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <Input 
                          id="name" 
                          value={form.name} 
                          onChange={(e)=>setForm({...form, name: e.target.value})} 
                          required 
                          className="h-12 text-base flex-1 min-w-0" 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="h-12 flex-shrink-0" 
                          onClick={() => setForm({ ...form, name: generateBoulderName(form.color, form.difficulty) })}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Vorschlagen</span>
                        </Button>
                      </div>
                    </div>
                    <div className="w-full min-w-0">
                      <Label>Sektor *</Label>
                      <Select value={form.sector_id} onValueChange={(v)=>setForm({...form, sector_id: v})}>
                        <SelectTrigger className="h-12 text-base w-full">
                          <SelectValue placeholder="Sektor wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="spans-multiple-sectors"
                        checked={form.spansMultipleSectors}
                        onChange={(e) => setForm({...form, spansMultipleSectors: e.target.checked, sector_id_2: e.target.checked ? form.sector_id_2 : ''})}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="spans-multiple-sectors" className="cursor-pointer">
                        Verläuft über mehrere Sektoren
                      </Label>
                    </div>
                    {form.spansMultipleSectors && (
                      <div className="w-full min-w-0">
                        <Label>Endet in Sektor</Label>
                        <Select 
                          value={form.sector_id_2} 
                          onValueChange={(v)=>setForm({...form, sector_id_2: v})}
                          disabled={!form.sector_id}
                        >
                          <SelectTrigger className="h-12 text-base w-full">
                            <SelectValue placeholder="Sektor wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {sectors?.filter(s => s.id !== form.sector_id).map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Video */}
                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div className="w-full min-w-0">
                      <Label>Beta-Video *</Label>
                      <div className="flex flex-col gap-3 w-full min-w-0 mb-4">
                        <div className="flex gap-2 w-full min-w-0">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1 h-12 min-w-0 text-sm sm:text-base" 
                            onClick={()=>{
                              setForm({...form, file: null, videoUrl: ''});
                              captureInputRef.current?.click();
                            }}
                          >
                            <span className="truncate">Video aufnehmen</span>
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1 h-12 min-w-0 text-sm sm:text-base" 
                            onClick={()=>{
                              setForm({...form, file: null, videoUrl: ''});
                              galleryInputRef.current?.click();
                            }}
                          >
                            <span className="truncate">Aus Galerie</span>
                          </Button>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">oder</span>
                          </div>
                        </div>
                        <div className="w-full min-w-0">
                          <Label className="text-sm mb-2 block">Video aus CDN auswählen</Label>
                          <VideoSelector
                            selectedUrl={form.videoUrl}
                            onSelect={(url) => {
                              setForm({...form, videoUrl: url, file: null});
                            }}
                          />
                        </div>
                      </div>
                      <input 
                        ref={captureInputRef} 
                        hidden 
                        type="file" 
                        accept="video/*" 
                        capture="environment" 
                        onChange={(e)=>{
                          const file = e.target.files?.[0] || null;
                          setForm({...form, file, videoUrl: ''});
                        }} 
                      />
                      <input 
                        ref={galleryInputRef} 
                        hidden 
                        type="file" 
                        accept="video/*" 
                        onChange={(e)=>{
                          const file = e.target.files?.[0] || null;
                          setForm({...form, file, videoUrl: ''});
                        }} 
                      />
                      {(form.file || form.videoUrl) && (
                        <div className="mt-4">
                          {form.file && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Ausgewählt: {form.file.name} ({(form.file.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                          {form.videoUrl && (
                            <p className="text-sm text-muted-foreground mb-2">
                              CDN-Video: {form.videoUrl}
                            </p>
                          )}
                          {videoPreviewUrl && (
                            <div className="aspect-[9/16] w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                              <video 
                                src={videoPreviewUrl} 
                                controls 
                                className="w-full h-full object-cover"
                                playsInline
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Thumbnail */}
                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <div className="w-full min-w-0">
                      <Label>Thumbnail (optional)</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Zeige die Startgriffe des Boulders. Dieses Bild wird in der Boulder-Liste angezeigt.
                      </p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-12" 
                        onClick={()=>thumbnailInputRef.current?.click()}
                      >
                        Thumbnail auswählen
                      </Button>
                      <input 
                        ref={thumbnailInputRef} 
                        hidden 
                        type="file" 
                        accept="image/*" 
                        onChange={(e)=>{
                          const file = e.target.files?.[0] || null;
                          setForm({...form, thumbnailFile: file});
                        }} 
                      />
                      {form.thumbnailFile && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            Ausgewählt: {form.thumbnailFile.name} ({(form.thumbnailFile.size / 1024).toFixed(2)} KB)
                          </p>
                          {thumbnailPreviewUrl && (
                            <div className="aspect-[9/16] w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                              <img 
                                src={thumbnailPreviewUrl} 
                                alt="Thumbnail preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Details */}
                {wizardStep === 4 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                      <div className="w-full min-w-0">
                        <Label>Schwierigkeit *</Label>
                        <Select value={form.difficulty === null ? '?' : String(form.difficulty)} onValueChange={(v)=>setForm({...form, difficulty: parseDifficulty(v)})}>
                          <SelectTrigger className="h-12 text-base w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map(d => <SelectItem key={d === null ? '?' : String(d)} value={d === null ? '?' : String(d)}>{formatDifficulty(d)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full min-w-0">
                        <Label>Farbe *</Label>
                        <Select value={form.color} onValueChange={(v)=>setForm(prev => ({...prev, color: v, name: adjustNameForColor(prev.name, v)}))}>
                          <SelectTrigger className="h-12 text-base w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLORS.map(c => (
                              <SelectItem key={c} value={c}>
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                                  <span>{c}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="w-full min-w-0">
                      <Label>Notizen</Label>
                      <Textarea 
                        value={form.note} 
                        onChange={(e)=>setForm({...form, note: e.target.value})} 
                        className="min-h-[100px] w-full min-w-0" 
                        placeholder="Optionale Notizen zum Boulder..."
                      />
                    </div>
                  </div>
                )}

                {/* Step 5: Preview */}
                {wizardStep === 5 && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="text-lg font-medium">{form.name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Sektor</Label>
                        <p className="text-lg font-medium">
                          {sectors?.find(s => s.id === form.sector_id)?.name || '-'}
                          {form.spansMultipleSectors && form.sector_id_2 && (
                            <span> → {sectors?.find(s => s.id === form.sector_id_2)?.name}</span>
                          )}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Schwierigkeit</Label>
                          <p className="text-lg font-medium">{form.difficulty}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Farbe</Label>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: COLOR_HEX[form.color] || '#9ca3af' }} />
                            <p className="text-lg font-medium">{form.color}</p>
                          </div>
                        </div>
                      </div>
                      {(form.file || form.videoUrl) && (
                        <div>
                          <Label className="text-muted-foreground">Video</Label>
                          {form.file && (
                            <p className="text-sm">{form.file.name} ({(form.file.size / 1024 / 1024).toFixed(2)} MB)</p>
                          )}
                          {form.videoUrl && (
                            <p className="text-sm break-all">{form.videoUrl}</p>
                          )}
                          {videoPreviewUrl && (
                            <div className="aspect-[9/16] w-full max-w-xs mt-2 rounded-lg overflow-hidden border">
                              <video 
                                src={videoPreviewUrl} 
                                controls 
                                className="w-full h-full object-cover"
                                playsInline
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {form.thumbnailFile && (
                        <div>
                          <Label className="text-muted-foreground">Thumbnail</Label>
                          <p className="text-sm">{form.thumbnailFile.name} ({(form.thumbnailFile.size / 1024).toFixed(2)} KB)</p>
                          {thumbnailPreviewUrl && (
                            <div className="aspect-[9/16] w-full max-w-xs mt-2 rounded-lg overflow-hidden border">
                              <img 
                                src={thumbnailPreviewUrl} 
                                alt="Thumbnail preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {form.note && (
                        <div>
                          <Label className="text-muted-foreground">Notizen</Label>
                          <p className="text-sm whitespace-pre-wrap">{form.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                    disabled={wizardStep === 1}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Zurück
                  </Button>
                  {wizardStep < 5 ? (
                    <Button
                      type="button"
                      onClick={() => {
                        // Validate current step before proceeding
                        if (wizardStep === 1 && !canProceedStep1) return;
                        if (wizardStep === 2 && !canProceedStep2) return;
                        if (wizardStep === 3 && !canProceedStep3) return;
                        if (wizardStep === 4 && !canProceedStep4) return;
                        setWizardStep(wizardStep + 1);
                      }}
                      disabled={
                        (wizardStep === 1 && !canProceedStep1) ||
                        (wizardStep === 2 && !canProceedStep2) ||
                        (wizardStep === 3 && !canProceedStep3) ||
                        (wizardStep === 4 && !canProceedStep4)
                      }
                      className="flex items-center gap-2"
                    >
                      Weiter
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={onWizardSubmit}
                      disabled={!canSubmit || isUploading}
                      className="flex items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Speichere...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Boulder speichern
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
        )}

        {view === 'edit' && (
            <div className="space-y-4 w-full min-w-0">
              <div className="flex gap-2 sticky top-[56px] z-10 bg-background py-2 overflow-x-auto w-full min-w-0 -mx-4 px-4">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Boulder suchen" className="pl-9 h-11 w-full min-w-0" value={editSearch} onChange={(e)=>setEditSearch(e.target.value)} />
                </div>
                <div className="w-32 sm:w-40 flex-shrink-0">
                  <Select value={editSector} onValueChange={setEditSector}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Sektor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 sm:w-36 flex-shrink-0">
                  <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Grad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 sm:w-40 flex-shrink-0">
                  <Select value={editColor} onValueChange={setEditColor}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Farbe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      {COLORS.map(c => (
                        <SelectItem key={c} value={c}>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                            <span>{c}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick-Filter wie im Boulderbereich (Farben + Grade) */}
              <div className="flex items-center gap-3 overflow-x-auto py-2">
                <div className="flex items-center gap-2">
                  {COLORS.map(c => (
                    <button key={c} className={`w-7 h-7 rounded-full border ${editColor===c?'ring-2 ring-primary':''}`} style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }}
                      onClick={()=>setEditColor(prev=> prev===c ? 'all' : c)}
                      aria-label={`Filter ${c}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {DIFFICULTIES.map(d => {
                    const dStr = d === null ? '?' : String(d);
                    return (
                      <button key={dStr} onClick={()=>setEditDifficulty(prev=> prev===dStr?'all':dStr)}
                        className={`w-7 h-7 rounded-full border grid place-items-center text-[11px] font-semibold ${editDifficulty===dStr?'bg-primary text-primary-foreground':'bg-muted text-foreground'}`}>
                        {formatDifficulty(d)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!editing ? (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBoulders.map(b => (
                    <button key={b.id} className="text-left" onClick={()=>startEdit(b)}>
                      <Card className="hover:bg-muted/50">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold ${TEXT_ON_COLOR[b.color] || 'text-white'}`} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                              {b.difficulty}
                            </span>
                            <div>
                              <div className="font-medium text-base">{b.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                              </div>
                            </div>
                          </div>
                          <span className="text-primary text-sm">Bearbeiten</span>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Boulder bearbeiten</CardTitle>
                </CardHeader>
                <CardContent>
                <form id="edit-form" onSubmit={submitEdit} className="space-y-4">
                    <div className="w-full min-w-0">
                      <Label>Name *</Label>
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="h-12 text-base flex-1 min-w-0" />
                        <Button type="button" variant="outline" className="h-12 flex-shrink-0" onClick={() => setForm({ ...form, name: generateBoulderName(form.color, form.difficulty) })}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Vorschlagen</span>
                        </Button>
                      </div>
                    </div>
                    <div className="w-full min-w-0">
                      <Label>Sektor *</Label>
                      <Select value={form.sector_id} onValueChange={(v)=>setForm({...form, sector_id: v})}>
                        <SelectTrigger className="h-12 text-base w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="spans-multiple-sectors-edit"
                        checked={form.spansMultipleSectors}
                        onChange={(e) => setForm({...form, spansMultipleSectors: e.target.checked, sector_id_2: e.target.checked ? form.sector_id_2 : ''})}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="spans-multiple-sectors-edit" className="cursor-pointer">
                        Verläuft über mehrere Sektoren
                      </Label>
                    </div>
                    {form.spansMultipleSectors && (
                      <div className="w-full min-w-0">
                        <Label>Endet in Sektor</Label>
                        <Select 
                          value={form.sector_id_2} 
                          onValueChange={(v)=>setForm({...form, sector_id_2: v})}
                          disabled={!form.sector_id}
                        >
                          <SelectTrigger className="h-12 text-base w-full">
                            <SelectValue placeholder="Sektor wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {sectors?.filter(s => s.id !== form.sector_id).map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                      <div className="w-full min-w-0">
                        <Label>Schwierigkeit *</Label>
                        <Select value={form.difficulty === null ? '?' : String(form.difficulty)} onValueChange={(v)=>setForm({...form, difficulty: parseDifficulty(v)})}>
                          <SelectTrigger className="h-12 text-base w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map(d => <SelectItem key={d === null ? '?' : String(d)} value={d === null ? '?' : String(d)}>{formatDifficulty(d)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full min-w-0">
                        <Label>Farbe *</Label>
                        <Select value={form.color} onValueChange={(v)=>setForm(prev => ({...prev, color: v, name: adjustNameForColor(prev.name, v)}))}>
                          <SelectTrigger className="h-12 text-base w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLORS.map(c => (
                              <SelectItem key={c} value={c}>
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                                  <span>{c}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="w-full min-w-0">
                      <Label>Beta-Video (optional)</Label>
                      <div className="flex gap-2 w-full min-w-0 mb-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1 h-12 min-w-0 text-sm sm:text-base" 
                          onClick={()=>captureInputRef.current?.click()}
                        >
                          <span className="truncate">Video aufnehmen</span>
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1 h-12 min-w-0 text-sm sm:text-base" 
                          onClick={()=>galleryInputRef.current?.click()}
                        >
                          <span className="truncate">Aus Galerie</span>
                        </Button>
                      </div>
                      <input 
                        ref={captureInputRef} 
                        hidden 
                        type="file" 
                        accept="video/*" 
                        capture="environment" 
                        onChange={(e)=>setForm({...form, file: e.target.files?.[0]||null})} 
                      />
                      <input 
                        ref={galleryInputRef} 
                        hidden 
                        type="file" 
                        accept="video/*" 
                        onChange={(e)=>setForm({...form, file: e.target.files?.[0]||null})} 
                      />
                      {editing.betaVideoUrl && !form.file && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-2">Aktuelles Video:</p>
                          <div className="aspect-[9/16] w-full max-w-xs rounded-lg overflow-hidden border">
                            <video src={editing.betaVideoUrl} controls className="w-full h-full object-cover" playsInline />
                          </div>
                        </div>
                      )}
                      {form.file && (
                        <p className="text-xs text-muted-foreground mt-2 truncate">
                          Neues Video: {form.file.name} ({(form.file.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                      {videoPreviewUrl && form.file && (
                        <div className="aspect-[9/16] w-full max-w-xs mt-2 rounded-lg overflow-hidden border">
                          <video src={videoPreviewUrl} controls className="w-full h-full object-cover" playsInline />
                        </div>
                      )}
                    </div>
                    <div className="w-full min-w-0">
                      <Label>Thumbnail (optional)</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Zeige die Startgriffe des Boulders. Dieses Bild wird in der Boulder-Liste angezeigt.
                      </p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-12 mb-2" 
                        onClick={()=>thumbnailInputRef.current?.click()}
                      >
                        {editing.thumbnailUrl && !form.thumbnailFile ? 'Thumbnail ändern' : 'Thumbnail auswählen'}
                      </Button>
                      <input 
                        ref={thumbnailInputRef} 
                        hidden 
                        type="file" 
                        accept="image/*" 
                        onChange={(e)=>{
                          const file = e.target.files?.[0] || null;
                          setForm({...form, thumbnailFile: file});
                        }} 
                      />
                      {editing?.thumbnailUrl && !form.thumbnailFile && (() => {
                        // Fix old URLs that incorrectly include /videos/ in the path
                        let thumbnailUrl = editing.thumbnailUrl;
                        if (thumbnailUrl.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
                          thumbnailUrl = thumbnailUrl.replace('/uploads/videos/', '/uploads/');
                        }
                        console.log('[Setter] Rendering thumbnail in edit view:', thumbnailUrl);
                        return (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-2">Aktuelles Thumbnail:</p>
                            <div className="aspect-[9/16] w-full max-w-xs rounded-lg overflow-hidden border">
                              <img 
                                src={thumbnailUrl} 
                                alt="Current thumbnail" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('[Setter] Thumbnail image failed to load:', thumbnailUrl);
                                  e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log('[Setter] Thumbnail image loaded successfully:', thumbnailUrl);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                      {form.thumbnailFile && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            Neues Thumbnail: {form.thumbnailFile.name} ({(form.thumbnailFile.size / 1024).toFixed(2)} KB)
                          </p>
                          {thumbnailPreviewUrl && (
                            <div className="aspect-[9/16] w-full max-w-xs rounded-lg overflow-hidden border">
                              <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="w-full min-w-0">
                      <Label>Notizen</Label>
                      <Textarea value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} className="min-h-[100px] w-full min-w-0" />
                    </div>
                    <div className="h-24" />
                  </form>
                </CardContent>
                <div className="p-4 pt-0 flex gap-2">
                  <Button form="edit-form" type="submit" className="h-12" disabled={!canSubmit || isUploading}>
                    {isUploading ? 'Speichere…' : 'Änderungen speichern'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 text-destructive"
                    disabled={deleteBoulder.isPending}
                    onClick={async () => {
                      if (!editing) return;
                      if (!confirm('Diesen Boulder wirklich löschen? Das Beta-Video wird ebenfalls gelöscht.')) return;
                      
                      try {
                        await deleteBoulder.mutateAsync(editing.id);
                        // Only close dialog after successful deletion
                        setEditing(null);
                      } catch (error) {
                        // Error is already handled by the hook's onError
                        // Don't close dialog on error
                      }
                    }}
                  >
                    {deleteBoulder.isPending ? 'Lösche...' : 'Löschen'}
                  </Button>
                </div>
              </Card>
              )}
            </div>
        )}

        {view === 'status' && (
          <div className="space-y-4 w-full min-w-0">
            <div className="flex gap-2 sticky top-[56px] z-10 bg-background py-2 overflow-x-auto w-full min-w-0 -mx-4 px-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Boulder suchen" className="pl-9 h-11 w-full min-w-0" value={editSearch} onChange={(e)=>setEditSearch(e.target.value)} />
              </div>
              <div className="w-32 sm:w-40 flex-shrink-0">
                <Select value={editSector} onValueChange={setEditSector}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Sektor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 sm:w-36 flex-shrink-0">
                <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Grad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32 sm:w-40 flex-shrink-0">
                <Select value={editColor} onValueChange={setEditColor}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Farbe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {COLORS.map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                          <span>{c}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36 sm:w-44 flex-shrink-0">
                <Select value={statusFilter} onValueChange={(v:any)=>setStatusFilter(v)}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="haengt">Hängt</SelectItem>
                    <SelectItem value="abgeschraubt">Abgeschraubt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{filteredBoulders.length} Einträge</span>
              <div className="text-sm">
                <button className="underline" onClick={()=>selectAll(filteredBoulders.map(b=>b.id), true)}>Alle auswählen</button>
                <span className="mx-2">·</span>
                <button className="underline" onClick={()=>selectAll(filteredBoulders.map(b=>b.id), false)}>Auswahl aufheben</button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {filteredBoulders.map(b => (
                <label key={b.id} className="block">
                  <Card className={`hover:bg-muted/50 ${selected[b.id] ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5" checked={!!selected[b.id]} onChange={()=>toggleSelect(b.id)} />
                        <span className={`w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold ${TEXT_ON_COLOR[b.color] || 'text-white'}`} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                          {b.difficulty}
                        </span>
                        <div>
                          <div className="font-medium text-base">{b.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full border">
                        {b.status === 'abgeschraubt' ? 'Abgeschraubt' : 'Hängt'}
                      </span>
                    </CardContent>
                  </Card>
                </label>
              ))}
            </div>
          </div>
        )}
        {view === 'schedule' && (
          <div className="space-y-3" ref={scheduleRef}>
            <Card>
              <CardHeader>
                <CardTitle>Schrauberplan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Sektor</Label>
                    <Select value={scheduleSectorId} onValueChange={setScheduleSectorId}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sektor wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Datum/Zeit</Label>
                    <Input type="datetime-local" value={scheduleDate} onChange={(e)=>setScheduleDate(e.target.value)} className="h-12" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={scheduleNextSector} className="w-full h-12">Eintragen</Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {weeks.map(({ weekStart, days }, wi) => (
                    <div key={wi} className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Woche ab {weekStart.toLocaleDateString()}</div>
                      <div className="grid grid-cols-1 gap-2">
                        {days.map((d, di) => {
                          const items = (schedule || []).filter(s => new Date(s.scheduled_at).toDateString() === d.toDateString());
                          return (
                            <div key={di} className="rounded-xl border bg-card p-3">
                              <div className="text-sm font-medium mb-2">{d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
                              {items.length === 0 ? (
                                <div className="text-xs text-muted-foreground">Keine Einträge</div>
                              ) : (
                                <div className="space-y-2">
                                  {items.map(it => {
                                    const sectorName = sectors?.find(s => s.id === it.sector_id)?.name || 'Sektor';
                                    const time = new Date(it.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return (
                                      <div key={it.id} className="flex items-center justify-between text-sm">
                                        <div>{time} · {sectorName}</div>
                                        <Button type="button" size="sm" variant="outline" onClick={()=>deleteSchedule.mutate(it.id)}>Löschen</Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {view === 'logs' && (
          <UploadLogViewer />
        )}
            </section>
          </div>
        </main>

      {/* Spacer for mobile only global nav */}
      <div className="h-24 md:h-0" />
      
      {/* Selection mode floating buttons without background bar */}
      {/* Desktop selection toolbar */}
      {view==='status' && selectedCount > 0 && (
        <div className="hidden md:flex sticky top-[88px] z-40 justify-end gap-3 px-4 py-2 bg-background/80 backdrop-blur border-b">
          <button
            aria-label="Auswahl abbrechen"
            className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-sm shadow"
            onClick={() => setSelected({})}
          >
            Abbrechen
          </button>
          <button
            aria-label="Ausgewählte reinschrauben"
            className="h-9 px-3 rounded-md bg-success text-success-foreground text-sm shadow flex items-center gap-2"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'haengt' });
              setSelected({});
            }}
          >
            <MaterialIcon name="input_circle" className="w-4 h-4" size={16} />
            Reinschrauben
          </button>
          <button
            aria-label="Ausgewählte rausschrauben"
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm shadow flex items-center gap-2"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'abgeschraubt' });
              setSelected({});
            }}
          >
            <MaterialIcon name="output_circle" className="w-4 h-4" size={16} />
            Rausschrauben
          </button>
        </div>
      )}

      {/* Mobile floating buttons for selection */}
      {view==='status' && selectedCount > 0 && (
        <div className="md:hidden fixed z-[80] right-4 bottom-6 flex items-center gap-3">
          <button
            aria-label="Auswahl abbrechen"
            className="w-12 h-12 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow-xl"
            onClick={() => setSelected({})}
          >
            <X className="w-5 h-5" />
          </button>
          <button
            aria-label="Ausgewählte reinschrauben"
            className="w-12 h-12 rounded-full bg-success text-success-foreground grid place-items-center shadow-xl"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'haengt' });
              setSelected({});
            }}
          >
            <MaterialIcon name="input_circle" className="w-5 h-5" size={20} />
          </button>
          <button
            aria-label="Ausgewählte rausschrauben"
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-xl"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'abgeschraubt' });
              setSelected({});
            }}
          >
            <MaterialIcon name="output_circle" className="w-5 h-5" size={20} />
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default Setter;


