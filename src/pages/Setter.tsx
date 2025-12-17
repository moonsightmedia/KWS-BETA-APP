import { useEffect, useMemo, useCallback } from 'react';
import { DashboardHeader, SetterTabTitleProvider } from '@/components/DashboardHeader';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useSectorsTransformed, useUpdateSector } from '@/hooks/useSectors';
import { useBouldersWithSectors, useCreateBoulder, useUpdateBoulder, useBulkUpdateBoulderStatus, useDeleteBoulder, useCdnVideos } from '@/hooks/useBoulders';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, PlusCircle, Edit3, Edit2, Eye, Calendar as CalendarIcon, X, Sparkles, ChevronLeft, ChevronRight, Check, Video, Upload, Plus, CheckCircle, MinusCircle, FileVideo, Image as ImageIcon, Trash2, Clock, MapPin, Loader2 } from 'lucide-react';
import { MaterialIcon } from '@/components/MaterialIcon';
import { useMemo as useMemoReact, useRef, useState } from 'react';
import { useSectorSchedule, useCreateSectorSchedule, useDeleteSectorSchedule } from '@/hooks/useSectorSchedule';
import { useColors } from '@/hooks/useColors';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BatchUpload } from '@/components/setter/BatchUpload';
import { Boulder } from '@/types/boulder';
import { cn } from '@/lib/utils';
import { useUpload } from '@/contexts/UploadContext';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                          <Check className="w-6 h-6 text-primary-foreground" />
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

// DatePickerPopover component with local state and confirm button
const DatePickerPopover = ({ 
  selected, 
  onSelect, 
  fromYear, 
  toYear 
}: { 
  selected: Date | undefined; 
  onSelect: (date: Date | undefined) => void; 
  fromYear: number; 
  toYear: number;
}) => {
  const [tempDate, setTempDate] = useState<Date | undefined>(selected || new Date());
  const [open, setOpen] = useState(false);

  // Update tempDate when selected changes externally
  useEffect(() => {
    if (selected) {
      setTempDate(selected);
    } else {
      setTempDate(new Date());
    }
  }, [selected]);

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = Number(e.target.value);
    const newDate = new Date(tempDate);
    newDate.setDate(newDay);
    setTempDate(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonth = Number(e.target.value);
    const newDate = new Date(tempDate);
    newDate.setMonth(selectedMonth);
    // Adjust day if it exceeds days in new month
    const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    if (newDate.getDate() > daysInNewMonth) {
      newDate.setDate(daysInNewMonth);
    }
    setTempDate(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedYear = Number(e.target.value);
    const newDate = new Date(tempDate);
    newDate.setFullYear(selectedYear);
    // Adjust day if it exceeds days in new month (e.g., Feb 29 -> Feb 28)
    const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    if (newDate.getDate() > daysInNewMonth) {
      newDate.setDate(daysInNewMonth);
    }
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    onSelect(tempDate);
    setOpen(false);
  };

  const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i, 1), "MMMM", { locale: de }),
  }));
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-12 w-full justify-start text-left font-normal border-[#E7F7E9] hover:bg-[#F9FAF9] text-base",
            !selected && "text-[#13112B]/40"
          )}
        >
          <CalendarIcon className="mr-3 h-5 w-5 text-[#13112B]/60" />
          {selected ? (
            format(selected, "dd.MM.yyyy", { locale: de })
          ) : (
            <span className="text-[#13112B]/40">tt.mm.jjjj</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-auto p-4 border-[#E7F7E9] rounded-xl z-[200] bg-white" align="start">
        <div className="flex items-center gap-2 justify-center w-full py-2">
          <select
            value={tempDate.getDate()}
            onChange={handleDayChange}
            className="h-11 px-3 rounded-xl border border-[#E7F7E9] bg-white text-sm text-[#13112B] focus:outline-none focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531] hover:bg-[#F9FAF9] transition-colors appearance-none cursor-pointer flex-1 sm:flex-none sm:min-w-[70px] shadow-sm"
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <select
            value={tempDate.getMonth()}
            onChange={handleMonthChange}
            className="h-11 px-3 rounded-xl border border-[#E7F7E9] bg-white text-sm text-[#13112B] focus:outline-none focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531] hover:bg-[#F9FAF9] transition-colors appearance-none cursor-pointer flex-1 sm:flex-none sm:min-w-[120px] shadow-sm"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            value={tempDate.getFullYear()}
            onChange={handleYearChange}
            className="h-11 px-3 rounded-xl border border-[#E7F7E9] bg-white text-sm text-[#13112B] focus:outline-none focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531] hover:bg-[#F9FAF9] transition-colors appearance-none cursor-pointer flex-1 sm:flex-none sm:min-w-[80px] shadow-sm"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-3 border-t border-[#E7F7E9] flex gap-2 mt-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1 border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-[#36B531] hover:bg-[#2da029] text-white"
          >
            Bestätigen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const Setter = () => {
  const { session, loading: authLoading } = useAuth();
  const { hasRole: isSetter, loading: loadingSetter } = useHasRole('setter');
  const { hasRole: isAdmin, loading: loadingAdmin } = useHasRole('admin');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setHideMobileNav, isExpanded } = useSidebar();
  // CRITICAL: Only run queries after auth loading is complete
  const { data: sectors } = useSectorsTransformed(!authLoading);
  const { data: boulders } = useBouldersWithSectors(!authLoading);
  const createBoulder = useCreateBoulder();
  const updateBoulder = useUpdateBoulder();
  const deleteBoulder = useDeleteBoulder();
  const updateSector = useUpdateSector();
  const { startUpload } = useUpload();

  useEffect(() => {
    // Only redirect if auth is done loading and there's no session
    // This prevents redirect during page refresh when session is still loading
    if (!authLoading && !session) {
      // Save current route before navigating to auth, so we can return after login
      try {
        const currentRoute = window.location.pathname + window.location.search;
        if (currentRoute !== '/auth') {
          sessionStorage.setItem('preserveRoute', currentRoute);
          console.log('[Setter] Saving route before redirect to auth:', currentRoute);
        }
      } catch (error) {
        // Ignore storage errors
        console.warn('[Setter] Error saving route:', error);
      }
      navigate('/auth');
    }
  }, [session, authLoading, navigate]);

  const isLoadingRoles = loadingSetter || loadingAdmin;
  const canAccess = isSetter || isAdmin;

  // Timeout for role loading - if it takes too long, show error or fallback
  useEffect(() => {
    if (!isLoadingRoles) return;

    const timeoutId = setTimeout(() => {
      if (isLoadingRoles) {
        console.warn('[Setter] Role loading timeout - roles taking too long to load');
        // Don't set loading to false here - let the hooks handle it
        // But log for debugging
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeoutId);
  }, [isLoadingRoles]);

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
  const [addBoulderFn, setAddBoulderFn] = useState<(() => void) | null>(null);
  
  // Use useCallback to prevent onAddBoulderRef from changing on every render
  const handleAddBoulderRef = useCallback((fn: () => void) => {
    setAddBoulderFn(() => fn);
  }, []);
  
  // Get view from URL query parameter, default to 'batch'
  const viewParam = searchParams.get('view');
  const view: 'create' | 'edit' | 'schedule' | 'batch' | 'status' = 
    (viewParam && ['create', 'edit', 'schedule', 'batch', 'status'].includes(viewParam))
      ? (viewParam as typeof view)
      : 'batch';
  
  // Ensure URL parameter is set on initial load
  useEffect(() => {
    if (!viewParam || !['create', 'edit', 'schedule', 'batch', 'status'].includes(viewParam)) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('view', 'batch');
      setSearchParams(newSearchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Update URL when view changes
  const setView = (newView: 'create' | 'edit' | 'schedule' | 'batch' | 'status') => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('view', newView);
    setSearchParams(newSearchParams, { replace: true });
  };
  // Wizard state for multi-step boulder creation
  const [wizardStep, setWizardStep] = useState(1);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [editSearch, setEditSearch] = useState('');
  const [editSector, setEditSector] = useState<string>('all');
  const [editDifficulty, setEditDifficulty] = useState<string>('all');
  const [editColor, setEditColor] = useState<string>('all');
  const [editing, setEditing] = useState<any | null>(null);
  const [scheduleSectorIds, setScheduleSectorIds] = useState<Set<string>>(new Set());
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const { data: schedule } = useSectorSchedule();
  const createSchedule = useCreateSectorSchedule();
  const deleteSchedule = useDeleteSectorSchedule();
  const [selectedBouldersForDelete, setSelectedBouldersForDelete] = useState<Set<string>>(new Set());
  // Status management state
  const [selectedBouldersForStatus, setSelectedBouldersForStatus] = useState<Set<string>>(new Set());
  const [statusSectorFilter, setStatusSectorFilter] = useState<string>('all');
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [boulderForStatusChange, setBoulderForStatusChange] = useState<Boulder | null>(null);
  const bulkStatusUpdate = useBulkUpdateBoulderStatus();
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

  // Helper function to get thumbnail URL for a boulder
  const getThumbnailUrl = (b: any): string | null => {
    if (!b.thumbnailUrl) return null;
    // Fix old URLs that incorrectly include /videos/ in the path
    let url = b.thumbnailUrl;
    if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
      url = url.replace('/uploads/videos/', '/uploads/');
    }
    return url;
  };

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

  // Reset isUploading when dialog closes
  useEffect(() => {
    if (!editing) {
      setIsUploading(false);
    }
  }, [editing]);

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
      
      // Upload functionality removed
      
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
        try {
          await startUpload(createdBoulder.id, form.file, 'video', form.sector_id);
          toast.success('Video-Upload gestartet');
        } catch (error: any) {
          console.error('[Setter] Error starting video upload:', error);
          toast.error('Fehler beim Starten des Video-Uploads', {
            description: error.message || 'Unbekannter Fehler',
          });
        }
      }
      
      // If there's a thumbnail file, upload it
      if (form.thumbnailFile && createdBoulder?.id) {
        try {
          await startUpload(createdBoulder.id, form.thumbnailFile, 'thumbnail', form.sector_id);
          toast.success('Thumbnail-Upload gestartet');
        } catch (error: any) {
          console.error('[Setter] Error starting thumbnail upload:', error);
          toast.error('Fehler beim Starten des Thumbnail-Uploads', {
            description: error.message || 'Unbekannter Fehler',
          });
        }
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

  // Filtered boulders for status management
  const filteredBouldersForStatus = useMemo(() => {
    let list = boulders || [];
    if (statusSectorFilter !== 'all') {
      const selectedSectorName = sectors?.find(s => s.id === statusSectorFilter)?.name;
      list = list.filter(b => {
        const inSector1 = b.sector === selectedSectorName;
        const inSector2 = b.sector2 === selectedSectorName;
        return inSector1 || inSector2;
      });
    }
    return list;
  }, [boulders, statusSectorFilter, sectors]);

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
    if (!editing) {
      console.log('[Setter] submitEdit: No editing boulder');
      return;
    }
    if (isUploading) {
      console.log('[Setter] submitEdit: Already uploading, preventing double submission');
      return; // Prevent double submission
    }
    
    console.log('[Setter] submitEdit: Starting update for boulder:', editing.id);
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
      
      console.log('[Setter] submitEdit: Update data prepared:', updateData);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('[Setter] submitEdit: Timeout after 30 seconds');
          reject(new Error('Zeitüberschreitung beim Speichern. Bitte versuche es erneut.'));
        }, 30000);
      });
      
      console.log('[Setter] submitEdit: Starting mutation...');
      const result = await Promise.race([
        updateBoulder.mutateAsync(updateData as any),
        timeoutPromise
      ]);
      
      console.log('[Setter] submitEdit: Mutation successful:', result);
      
      // If there's a new video file, upload it
      if (form.file && editing?.id) {
        try {
          await startUpload(editing.id, form.file, 'video', form.sector_id);
          toast.success('Video-Upload gestartet');
        } catch (error: any) {
          console.error('[Setter] Error starting video upload:', error);
          toast.error('Fehler beim Starten des Video-Uploads', {
            description: error.message || 'Unbekannter Fehler',
          });
        }
      }
      
      // If there's a new thumbnail file, upload it
      if (form.thumbnailFile && editing?.id) {
        try {
          await startUpload(editing.id, form.thumbnailFile, 'thumbnail', form.sector_id);
          toast.success('Thumbnail-Upload gestartet');
        } catch (error: any) {
          console.error('[Setter] Error starting thumbnail upload:', error);
          toast.error('Fehler beim Starten des Thumbnail-Uploads', {
            description: error.message || 'Unbekannter Fehler',
          });
        }
      }
      
      // Reset form file fields
      setForm(prev => ({ ...prev, file: null, thumbnailFile: null }));
      setEditing(null);
      setVideoPreviewUrl(null);
      setThumbnailPreviewUrl(null);
    } catch (error: any) {
      // Dismiss any existing upload toast on error
      toast.dismiss();
      console.error('[Setter] submitEdit: Error updating boulder:', error);
      console.error('[Setter] submitEdit: Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      toast.error('Fehler beim Aktualisieren', {
        description: error.message || 'Unbekannter Fehler',
        duration: 5000, // Auto-dismiss after 5 seconds
      });
    } finally {
      console.log('[Setter] submitEdit: Finally block - resetting isUploading');
      setIsUploading(false);
    }
  };

  const scheduleNextSector = async () => {
    if (scheduleSectorIds.size === 0 || !scheduleDate || !scheduleTime) return;
    
    // Combine date and time into ISO string
    const dateTime = new Date(scheduleDate);
    const [hours, minutes] = scheduleTime.split(':');
    dateTime.setHours(parseInt(hours, 10));
    dateTime.setMinutes(parseInt(minutes, 10));
    
    // Create a schedule entry for each selected sector
    const promises = Array.from(scheduleSectorIds).map(sectorId => 
      createSchedule.mutateAsync({ 
        sector_id: sectorId, 
        scheduled_at: dateTime.toISOString(), 
        note: null 
      } as any)
    );
    
    try {
      await Promise.all(promises);
      setScheduleSectorIds(new Set());
      setScheduleDate(undefined);
      setScheduleTime('');
      setScheduleDialogOpen(false);
    } catch (error) {
      console.error('Error creating schedules:', error);
      throw error;
    }
  };

  // Group schedule items by date
  const groupedSchedule = useMemo(() => {
    if (!schedule || !sectors) return [];
    
    const now = new Date();
    const grouped: Array<{ date: Date; items: typeof schedule }> = [];
    const dateMap = new Map<string, typeof schedule>();
    
    schedule.forEach(item => {
      const itemDate = new Date(item.scheduled_at);
      const dateKey = itemDate.toDateString();
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(item);
    });
    
    // Convert to array and sort by date
    dateMap.forEach((items, dateKey) => {
      const date = new Date(dateKey);
      grouped.push({ date, items: items.sort((a, b) => 
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      ) });
    });
    
    // Sort by date: upcoming dates first (ascending), then past dates (descending - newest first)
    return grouped.sort((a, b) => {
      const aTime = a.date.getTime();
      const bTime = b.date.getTime();
      const nowTime = now.getTime();
      
      const aIsPast = aTime < nowTime;
      const bIsPast = bTime < nowTime;
      
      // If both are future dates, sort ascending (earliest first)
      if (!aIsPast && !bIsPast) {
        return aTime - bTime;
      }
      
      // If both are past dates, sort descending (newest first)
      if (aIsPast && bIsPast) {
        return bTime - aTime;
      }
      
      // Future dates come before past dates
      return aIsPast ? 1 : -1;
    });
  }, [schedule, sectors]);

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


  // Warte, bis die Rollen geladen sind, bevor wir "Zugriff verweigert" anzeigen
  if (isLoadingRoles) {
    return (
      <div className="min-h-screen bg-[#F9FAF9] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#36B531] mx-auto mb-4"></div>
          <p className="text-[#13112B]/60">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#F9FAF9] flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white border border-[#E7F7E9] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-heading font-bold text-[#13112B]">Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#13112B]/60">Du benötigst die Rolle Setter oder Admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Map view to title
  const getTabTitle = (view: string): string => {
    const titleMap: Record<string, string> = {
      'batch': 'ERSTELLEN',
      'edit': 'BEARBEITEN',
      'status': 'STATUS',
      'schedule': 'SCHRAUBERPLAN',
    };
    return titleMap[view] || 'SETTER';
  };

  return (
    <SetterTabTitleProvider tabTitle={getTabTitle(view)}>
      <div className="min-h-screen bg-[#F9FAF9] flex">
        <div className={cn("flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0", isExpanded ? "md:ml-64" : "md:ml-20")}        >
          <DashboardHeader />
          <main 
            className="flex-1 p-4 md:p-8 w-full min-w-0"
            style={{
              paddingTop: 'max(calc(1rem + env(safe-area-inset-top, 0px)), 1rem)'
            }}
          >
            {/* Tabs navigation - hidden */}
            <Tabs value={view} onValueChange={(value) => setView(value as typeof view)} className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-4 mb-6 h-auto min-w-0 hidden">
              <TabsTrigger value="batch" className="text-xs sm:text-sm min-w-0">Erstellen</TabsTrigger>
              <TabsTrigger value="edit" className="text-xs sm:text-sm min-w-0">Bearbeiten</TabsTrigger>
              <TabsTrigger value="status" className="text-xs sm:text-sm min-w-0">Status</TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs sm:text-sm min-w-0">Termin</TabsTrigger>
            </TabsList>

              <TabsContent value="batch" className="mt-0">
                <BatchUpload />
              </TabsContent>

              <TabsContent value="edit" className="mt-0 w-full min-w-0">
                <div className="space-y-4 w-full min-w-0">
                  {/* Create wizard - currently disabled */}
                  {false && (
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
                          <Sparkles className="w-5 h-5 mr-2" />
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
                                muted
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
                                  <span className="w-3 h-3 rounded-xl border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
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
                            <span className="w-4 h-4 rounded-xl border" style={{ backgroundColor: COLOR_HEX[form.color] || '#9ca3af' }} />
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
                                muted
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
                    <ChevronLeft className="w-5 h-5" />
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
                      <ChevronRight className="w-5 h-5" />
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
                          <Check className="w-5 h-5" />
                          Boulder speichern
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
                    </Card>
                  )}
              <div className="flex flex-col sm:flex-row gap-2 sticky top-[56px] z-10 bg-white py-3 px-4 md:px-8 w-full min-w-0 scrollbar-hide shadow-sm border-b border-[#E7F7E9] rounded-t-xl">
                <div className="relative flex-1 min-w-0 flex items-center">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#13112B]/40 z-10" />
                  <Input placeholder="Boulder suchen" className="pl-9 h-11 w-full min-w-0 border border-[#E7F7E9] rounded-xl focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]" value={editSearch} onChange={(e)=>setEditSearch(e.target.value)} />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none sm:w-32 md:w-40 min-w-0">
                    <Select value={editSector} onValueChange={setEditSector}>
                      <SelectTrigger className="h-11 w-full border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]">
                        <SelectValue placeholder="Sektor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Sektor</SelectItem>
                        {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 sm:flex-none sm:w-28 md:w-36 min-w-0">
                    <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                      <SelectTrigger className="h-11 w-full border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]">
                        <SelectValue placeholder="Grad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Grad</SelectItem>
                        {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{formatDifficulty(d)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 sm:flex-none sm:w-32 md:w-40 min-w-0">
                    <Select value={editColor} onValueChange={setEditColor}>
                      <SelectTrigger className="h-11 w-full border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]">
                        <SelectValue placeholder="Farbe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Farbe</SelectItem>
                        {COLORS.map(c => (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-xl border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                              <span>{c}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {!editing ? (
                <>
                  {/* Alle auswählen Button - nur wenn keine Auswahl */}
                  {selectedBouldersForDelete.size === 0 && (
                    <div className="mb-4 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = new Set(filteredBoulders.map(b => b.id));
                          setSelectedBouldersForDelete(allIds);
                        }}
                        className="w-full sm:w-auto h-11 border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] rounded-xl"
                      >
                        Alle auswählen
                      </Button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 w-full">
                    {filteredBoulders.map(b => {
                      const thumbnailUrl = getThumbnailUrl(b);
                      const isSelected = selectedBouldersForDelete.has(b.id);
                      return (
                      <div key={b.id} className="relative w-full">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedBouldersForDelete(prev => {
                              const next = new Set(prev);
                              if (checked) {
                                next.add(b.id);
                              } else {
                                next.delete(b.id);
                              }
                              return next;
                            });
                          }}
                          className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm w-5 h-5 sm:w-4 sm:h-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="text-left w-full touch-manipulation cursor-pointer" 
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            // Wenn bereits ein Boulder ausgewählt ist, nur Auswahl umschalten
                            if (selectedBouldersForDelete.size > 0) {
                              e.preventDefault();
                              setSelectedBouldersForDelete(prev => {
                                const next = new Set(prev);
                                if (isSelected) {
                                  next.delete(b.id);
                                } else {
                                  next.add(b.id);
                                }
                                return next;
                              });
                            } else {
                              // Wenn kein Boulder ausgewählt ist, Edit-Dialog öffnen
                              if (isSelected) {
                                e.preventDefault();
                                setSelectedBouldersForDelete(prev => {
                                  const next = new Set(prev);
                                  next.delete(b.id);
                                  return next;
                                });
                              } else {
                                startEdit(b);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (selectedBouldersForDelete.size > 0) {
                                setSelectedBouldersForDelete(prev => {
                                  const next = new Set(prev);
                                  if (isSelected) {
                                    next.delete(b.id);
                                  } else {
                                    next.add(b.id);
                                  }
                                  return next;
                                });
                              } else {
                                if (!isSelected) {
                                  startEdit(b);
                                }
                              }
                            }
                          }}
                        >
                          <Card className={cn("bg-white border border-[#E7F7E9] hover:shadow-md transition-all w-full", isSelected ? 'ring-2 ring-[#36B531] bg-[#E7F7E9]' : '')}>
                            <CardContent className="p-4 flex items-center gap-3 w-full min-w-0 overflow-hidden">
                              <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                                {thumbnailUrl && (
                                  <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-[#F9FAF9] border border-[#E7F7E9]">
                                    <img 
                                      src={thumbnailUrl} 
                                      alt={b.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                <span className={cn("w-7 h-7 rounded-xl border-2 grid place-items-center text-xs font-semibold flex-shrink-0", TEXT_ON_COLOR[b.color] || 'text-white')} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                                  {formatDifficulty(b.difficulty)}
                                </span>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="font-medium text-base text-[#13112B] truncate">{b.name}</div>
                                  <div className="text-xs text-[#13112B]/60 truncate">
                                    {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                                  </div>
                                </div>
                              </div>
                              {!isSelected && (
                                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startEdit(b);
                                    }}
                                    className="h-8 w-8 rounded-lg hover:bg-[#E7F7E9]"
                                  >
                                    <Edit2 className="w-4 h-4 text-[#13112B]" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // View details - could open detail dialog
                                      console.log('View boulder:', b.id);
                                    }}
                                    className="h-8 w-8 rounded-lg hover:bg-[#E7F7E9]"
                                  >
                                    <Eye className="w-4 h-4 text-[#13112B]" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedBouldersForDelete(prev => {
                                        const next = new Set(prev);
                                        next.add(b.id);
                                        return next;
                                      });
                                    }}
                                    className="h-8 w-8 rounded-lg hover:bg-red-50 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )})}
                  </div>
                </>
              ) : (
              <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="sm:max-w-[450px] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-0 gap-0 w-full">
                  <div className="sticky top-0 z-20 bg-white border-b border-[#E7F7E9] px-4 sm:px-6 py-4 rounded-t-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-heading font-bold text-[#13112B]">Boulder bearbeiten</DialogTitle>
                      <DialogDescription className="text-sm text-[#13112B]/60">
                        Bearbeite den Boulder. Lade Video und Thumbnail hoch.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  
                  <form id="edit-form" onSubmit={submitEdit}>
                  <div className="px-4 sm:px-6 py-4 space-y-5">
                  
                    <div className="grid gap-3 py-2 sm:py-3 w-full box-border min-w-0">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full box-border min-w-0">
                        {/* Thumbnail Upload */}
                        <div className="relative w-full aspect-[9/16] max-h-[160px] bg-[#F9FAF9] rounded-xl border-2 border-dashed border-[#E7F7E9] hover:border-[#36B531]/50 hover:bg-[#E7F7E9]/50 transition-all overflow-hidden group cursor-pointer">
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 appearance-none text-[0]"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setForm({...form, thumbnailFile: file});
                            }}
                          />
                          {form.thumbnailFile ? (
                            <>
                              <img 
                                src={thumbnailPreviewUrl || ''} 
                                alt="Thumbnail" 
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2 bg-[#36B531] rounded-xl p-1 z-10">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            </>
                          ) : editing?.thumbnailUrl ? (() => {
                            let thumbnailUrl = editing.thumbnailUrl;
                            if (thumbnailUrl.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
                              thumbnailUrl = thumbnailUrl.replace('/uploads/videos/', '/uploads/');
                            }
                            return (
                              <>
                                <img 
                                  src={thumbnailUrl} 
                                  alt="Thumbnail" 
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <div className="absolute top-2 right-2 bg-[#36B531] rounded-xl p-1 z-10">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </>
                            );
                          })() : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                              <ImageIcon className="w-6 h-6 text-[#13112B]/40 mb-1" />
                              <span className="text-[10px] text-[#13112B]/60">Thumbnail</span>
                            </div>
                          )}
                        </div>

                        {/* Video Upload */}
                        <div className="relative w-full aspect-[9/16] max-h-[160px] bg-[#F9FAF9] rounded-xl border-2 border-dashed border-[#E7F7E9] hover:border-[#36B531]/50 hover:bg-[#E7F7E9]/50 transition-all overflow-hidden group cursor-pointer">
                          <input
                            ref={captureInputRef}
                            type="file"
                            accept="video/*"
                            capture="environment"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 appearance-none text-[0]"
                            onChange={(e) => {
                              setForm({...form, file: e.target.files?.[0]||null});
                            }}
                          />
                          <input
                            ref={galleryInputRef}
                            type="file"
                            accept="video/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 appearance-none text-[0]"
                            onChange={(e) => {
                              setForm({...form, file: e.target.files?.[0]||null});
                            }}
                          />
                          {form.file ? (
                            <>
                              <div className="absolute inset-0 w-full h-full bg-black/5 flex flex-col items-center justify-center p-2 text-center">
                                <FileVideo className="w-6 h-6 text-[#36B531] mb-1" />
                                <span className="text-[10px] text-[#13112B]/60 truncate w-full px-1">{form.file.name}</span>
                              </div>
                              <div className="absolute top-2 right-2 bg-[#36B531] rounded-xl p-1 z-10">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            </>
                          ) : editing?.betaVideoUrl ? (
                            <>
                              <div className="absolute inset-0 w-full h-full bg-black/5 flex flex-col items-center justify-center p-2 text-center">
                                <FileVideo className="w-6 h-6 text-[#36B531] mb-1" />
                                <span className="text-[10px] text-[#13112B]/60 truncate w-full px-1">Video vorhanden</span>
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
                              value={form.name} 
                              onChange={(e) => setForm({...form, name: e.target.value})} 
                              placeholder="Boulder Name"
                              className="flex-1 min-w-0 h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setForm({ ...form, name: generateBoulderName(form.color, form.difficulty) })}
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
                                    type="button"
                                    onClick={() => setForm({...form, sector_id: s.id})}
                                    className={cn(
                                      "flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap h-11",
                                      form.sector_id === s.id
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
                              id="spans-multiple-sectors-edit"
                              checked={form.spansMultipleSectors}
                              onCheckedChange={(checked) => setForm({...form, spansMultipleSectors: checked === true, sector_id_2: checked ? form.sector_id_2 : ''})}
                              className="border-[#E7F7E9] data-[state=checked]:bg-[#36B531] data-[state=checked]:text-white"
                            />
                            <Label htmlFor="spans-multiple-sectors-edit" className="cursor-pointer text-sm text-[#13112B]">
                              Verläuft über mehrere Sektoren
                            </Label>
                          </div>
                          {form.spansMultipleSectors && (
                            <div className="space-y-2 w-full box-border min-w-0">
                              <Label className="text-sm font-medium text-[#13112B]">Endet in Sektor</Label>
                              <div className="w-full overflow-x-auto overflow-y-hidden pb-2 box-border -mx-1 px-1 scrollbar-hide touch-pan-x">
                                <div className="flex gap-2 min-w-max">
                                  {sectors?.filter(s => s.id !== form.sector_id).map(s => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => setForm({...form, sector_id_2: s.id})}
                                      disabled={!form.sector_id}
                                      className={cn(
                                        "flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap h-11",
                                        form.sector_id_2 === s.id
                                          ? "bg-[#36B531] text-white border-[#36B531] shadow-sm"
                                          : "bg-white text-[#13112B] border-[#E7F7E9] hover:bg-[#E7F7E9] hover:text-[#13112B]",
                                        !form.sector_id && "opacity-50 cursor-not-allowed"
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
                            <div className="w-full flex gap-2 flex-wrap">
                              {colorsDb?.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setForm(prev => ({...prev, color: c.name, name: adjustNameForColor(prev.name, c.name)}))}
                                  className={cn(
                                    "flex-shrink-0 w-11 h-11 rounded-xl transition-all border-2 flex items-center justify-center",
                                    form.color === c.name
                                      ? "border-[#36B531] shadow-lg scale-110 ring-2 ring-[#36B531] ring-offset-2"
                                      : "border-[#E7F7E9] hover:border-[#36B531]/50 hover:scale-105"
                                  )}
                                  style={getColorBackgroundStyle(c.name, colorsDb)}
                                  title={c.name}
                                >
                                  {form.color === c.name && (
                                    <div className="w-3 h-3 rounded-xl bg-white/90 shadow-sm" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 w-full box-border min-w-0">
                          <Label className="text-sm font-medium text-[#13112B]">Schwierigkeit: {form.difficulty || '?'}</Label>
                          <div className="grid grid-cols-9 gap-1.5 w-full min-w-0">
                            {[null, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                              <button
                                key={level === null ? '?' : level}
                                type="button"
                                onClick={() => setForm({...form, difficulty: level, name: generateBoulderName(form.color, level)})}
                                className={cn(
                                  "w-full aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all border min-w-0",
                                  form.difficulty === level 
                                    ? "bg-[#36B531] text-white border-[#36B531] shadow-sm" 
                                    : "bg-white text-[#13112B] border-[#E7F7E9] hover:bg-[#E7F7E9] hover:text-[#13112B]"
                                )}
                              >
                                {level === null ? '?' : level}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2 w-full box-border min-w-0">
                          <Label className="text-sm font-medium text-[#13112B]">Notizen</Label>
                          <Textarea value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} className="min-h-[100px] w-full min-w-0 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 z-20 bg-white border-t border-[#E7F7E9] px-4 sm:px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setEditing(null)}
                      className="h-11 w-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] hover:text-[#13112B] flex items-center justify-center"
                      title="Abbrechen"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-11 text-[#E74C3C] border-[#E7F7E9] hover:bg-red-50 hover:text-[#E74C3C] rounded-xl flex items-center justify-center"
                      disabled={deleteBoulder.isPending}
                      onClick={async () => {
                        if (!editing) return;
                        if (!confirm('Diesen Boulder wirklich löschen? Das Beta-Video wird ebenfalls gelöscht.')) return;
                        
                        try {
                          await deleteBoulder.mutateAsync(editing.id);
                          setEditing(null);
                        } catch (error) {
                          // Error is already handled by the hook's onError
                        }
                      }}
                      title="Boulder löschen"
                    >
                      {deleteBoulder.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </Button>
                    <Button
                      form="edit-form"
                      type="submit"
                      className="h-11 w-11 bg-[#36B531] text-white hover:bg-[#2da029] rounded-xl flex items-center justify-center"
                      disabled={!canSubmit || isUploading}
                      title="Speichern"
                    >
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    </Button>
                  </div>
                  </form>
                </DialogContent>
              </Dialog>
              )}
                </div>
              </TabsContent>

              <TabsContent value="status" className="mt-0 w-full min-w-0">
                <div className="space-y-4 w-full min-w-0">
                  {/* Filter Bar */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="w-full sm:w-48 flex-shrink-0">
                      <Select value={statusSectorFilter} onValueChange={setStatusSectorFilter}>
                        <SelectTrigger className="h-11 w-full border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]">
                          <SelectValue placeholder="Sektor wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Sektoren</SelectItem>
                          {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                  </div>

                  {/* Boulder Count */}
                  <div className="text-sm text-[#13112B]/60">
                    {filteredBouldersForStatus.length} {filteredBouldersForStatus.length === 1 ? 'Boulder' : 'Boulder'} gefunden
                  </div>

                  {/* Boulder Grid */}
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 w-full" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
                    {filteredBouldersForStatus.map(b => {
                      const thumbnailUrl = getThumbnailUrl(b);
                      const currentStatus = (b as any).status || 'haengt';
                      
                      return (
                        <button
                          key={b.id}
                          className="text-left w-full touch-manipulation transition-all"
                          onClick={() => {
                            setBoulderForStatusChange(b);
                            setStatusChangeDialogOpen(true);
                          }}
                        >
                          <Card className="bg-white border border-[#E7F7E9] hover:shadow-md transition-all w-full">
                            <CardContent className="p-4 flex items-center gap-3 w-full min-w-0 overflow-hidden">
                              <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                                {thumbnailUrl && (
                                  <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-[#F9FAF9] border border-[#E7F7E9]">
                                    <img 
                                      src={thumbnailUrl} 
                                      alt={b.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                <span className={cn("w-7 h-7 rounded-xl border-2 grid place-items-center text-xs font-semibold flex-shrink-0", TEXT_ON_COLOR[b.color] || 'text-white')} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                                  {formatDifficulty(b.difficulty)}
                                </span>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="font-medium text-base text-[#13112B] truncate">{b.name}</div>
                                  <div className="text-xs text-[#13112B]/60 truncate">
                                    {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                                  </div>
                                </div>
                              </div>
                              <span className={cn("text-xs px-2 py-0.5 rounded-xl border flex-shrink-0", 
                                currentStatus === 'abgeschraubt' 
                                  ? 'bg-red-50 text-[#E74C3C] border-red-200' 
                                  : 'bg-[#E7F7E9] text-[#36B531] border-[#36B531]/20'
                              )}>
                                {currentStatus === 'abgeschraubt' ? 'Abgeschraubt' : 'Hängt'}
                              </span>
                            </CardContent>
                          </Card>
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Change Dialog */}
                  <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-heading font-bold text-[#13112B]">
                          Status ändern
                        </DialogTitle>
                        <DialogDescription className="text-sm text-[#13112B]/60">
                          {boulderForStatusChange && (
                            <>Status für <strong>{boulderForStatusChange.name}</strong> ändern</>
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            className={cn(
                              "h-12 justify-start text-left",
                              boulderForStatusChange && (boulderForStatusChange as any).status === 'haengt' && "bg-[#E7F7E9] border-[#36B531]"
                            )}
                            onClick={async () => {
                              if (!boulderForStatusChange) return;
                              try {
                                await bulkStatusUpdate.mutateAsync({ 
                                  ids: [boulderForStatusChange.id], 
                                  status: 'haengt' 
                                });
                                setStatusChangeDialogOpen(false);
                                setBoulderForStatusChange(null);
                                toast.success('Status geändert');
                              } catch (error) {
                                toast.error('Fehler beim Ändern des Status');
                              }
                            }}
                            disabled={bulkStatusUpdate.isPending}
                          >
                            <MaterialIcon name="input_circle" className="w-5 h-5 mr-2" size={20} />
                            <div className="flex-1 text-left">
                              <div className="font-medium">Reinschrauben</div>
                              <div className="text-xs text-[#13112B]/60">Boulder hängt</div>
                            </div>
                          </Button>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-12 justify-start text-left",
                              boulderForStatusChange && (boulderForStatusChange as any).status === 'abgeschraubt' && "bg-red-50 border-red-200"
                            )}
                            onClick={async () => {
                              if (!boulderForStatusChange) return;
                              try {
                                await bulkStatusUpdate.mutateAsync({ 
                                  ids: [boulderForStatusChange.id], 
                                  status: 'abgeschraubt' 
                                });
                                setStatusChangeDialogOpen(false);
                                setBoulderForStatusChange(null);
                                toast.success('Status geändert');
                              } catch (error) {
                                toast.error('Fehler beim Ändern des Status');
                              }
                            }}
                            disabled={bulkStatusUpdate.isPending}
                          >
                            <MaterialIcon name="output_circle" className="w-5 h-5 mr-2" size={20} />
                            <div className="flex-1 text-left">
                              <div className="font-medium">Rausschrauben</div>
                              <div className="text-xs text-[#13112B]/60">Boulder abgeschraubt</div>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {filteredBouldersForStatus.length === 0 && (
                    <div className="text-center py-12 text-[#13112B]/60">
                      Keine Boulder gefunden
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="mt-0 w-full min-w-0">
                <div className="space-y-4 w-full min-w-0" ref={scheduleRef}>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#13112B]/60">
                      {schedule?.length || 0} {schedule?.length === 1 ? 'Termin' : 'Termine'} geplant
                    </p>
                    <Button
                      onClick={() => setScheduleDialogOpen(true)}
                      className="h-11 bg-[#36B531] hover:bg-[#2da029] text-white rounded-xl px-4 gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Neuer Termin</span>
                    </Button>
                  </div>

                  {/* Schedule List */}
                  {groupedSchedule.length === 0 ? (
                    <Card className="bg-white border border-[#E7F7E9] rounded-2xl">
                      <CardContent className="p-12 text-center">
                        <CalendarIcon className="w-12 h-12 text-[#13112B]/20 mx-auto mb-4" />
                        <p className="text-[#13112B]/60 font-medium">Noch keine Termine geplant</p>
                        <p className="text-sm text-[#13112B]/40 mt-1">Erstelle deinen ersten Schraubtermin</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const now = new Date();
                        const upcomingGroups: typeof groupedSchedule = [];
                        const pastGroups: typeof groupedSchedule = [];
                        
                        groupedSchedule.forEach(group => {
                          const isToday = group.date.toDateString() === now.toDateString();
                          const isPast = group.date < now && !isToday;
                          if (isPast) {
                            pastGroups.push(group);
                          } else {
                            upcomingGroups.push(group);
                          }
                        });
                        
                        return (
                          <>
                            {/* Upcoming Schedule */}
                            {upcomingGroups.length > 0 && (
                              <div className="space-y-3">
                                {upcomingGroups.map(({ date, items }) => {
                                  const isToday = date.toDateString() === now.toDateString();
                                  
                                  return (
                                    <div key={date.toDateString()} className="space-y-2">
                                      {/* Compact Date Label */}
                                      <div className="flex items-center gap-2 px-2">
                                        <span className={cn(
                                          "text-xs font-medium uppercase tracking-wide",
                                          isToday ? "text-[#36B531]" : "text-[#13112B]/60"
                                        )}>
                                          {isToday ? 'Heute' : date.toLocaleDateString('de-DE', { 
                                            weekday: 'short', 
                                            day: '2-digit', 
                                            month: 'short'
                                          })}
                                        </span>
                                      </div>

                                      {/* Schedule Items */}
                                      {items.map(item => {
                                        const sectorName = sectors?.find(s => s.id === item.sector_id)?.name || 'Unbekannter Sektor';
                                        const itemDate = new Date(item.scheduled_at);
                                        const time = itemDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                                        
                                        return (
                                          <Card 
                                            key={item.id} 
                                            className="bg-white border border-[#E7F7E9] transition-all hover:shadow-md"
                                          >
                                            <CardContent className="p-4">
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <span className="text-sm font-medium flex-shrink-0 w-16 text-[#13112B]">
                                                    {time}
                                                  </span>
                                                  <div className="flex-1 min-w-0">
                                                    <span className="font-medium text-[#13112B] truncate block">{sectorName}</span>
                                                  </div>
                                                </div>
                                                <Button 
                                                  type="button" 
                                                  size="sm" 
                                                  variant="ghost"
                                                  onClick={async () => {
                                                    if (confirm('Möchtest du diesen Termin wirklich löschen?')) {
                                                      try {
                                                        await deleteSchedule.mutateAsync(item.id);
                                                        toast.success('Termin gelöscht');
                                                      } catch (error) {
                                                        toast.error('Fehler beim Löschen des Termins');
                                                        console.error('Delete schedule error:', error);
                                                      }
                                                    }
                                                  }}
                                                  disabled={deleteSchedule.isPending}
                                                  className="h-8 w-8 p-0 text-[#E74C3C] hover:bg-red-50 hover:text-[#E74C3C] rounded-xl flex-shrink-0 disabled:opacity-50"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Past Schedule */}
                            {pastGroups.length > 0 && (
                              <div className="space-y-3 mt-6">
                                <div className="px-2 pb-2">
                                  <h3 className="text-sm font-semibold text-[#13112B]/60 uppercase tracking-wide">Vergangene Termine</h3>
                                </div>
                                {pastGroups.map(({ date, items }) => {
                                  return (
                                    <div key={date.toDateString()} className="space-y-2">
                                      {/* Compact Date Label */}
                                      <div className="flex items-center gap-2 px-2">
                                        <span className="text-xs font-medium uppercase tracking-wide text-[#13112B]/40">
                                          {date.toLocaleDateString('de-DE', { 
                                            weekday: 'short', 
                                            day: '2-digit', 
                                            month: 'short'
                                          })}
                                        </span>
                                      </div>

                                      {/* Schedule Items */}
                                      {items.map(item => {
                                        const sectorName = sectors?.find(s => s.id === item.sector_id)?.name || 'Unbekannter Sektor';
                                        const itemDate = new Date(item.scheduled_at);
                                        const time = itemDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                                        
                                        return (
                                          <Card 
                                            key={item.id} 
                                            className="bg-white border border-[#E7F7E9] transition-all hover:shadow-md opacity-50"
                                          >
                                            <CardContent className="p-4">
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <span className="text-sm font-medium flex-shrink-0 w-16 text-[#13112B]/40">
                                                    {time}
                                                  </span>
                                                  <div className="flex-1 min-w-0">
                                                    <span className="font-medium text-[#13112B]/40 truncate block">{sectorName}</span>
                                                  </div>
                                                </div>
                                                <Button 
                                                  type="button" 
                                                  size="sm" 
                                                  variant="ghost"
                                                  onClick={async () => {
                                                    if (confirm('Möchtest du diesen Termin wirklich löschen?')) {
                                                      try {
                                                        await deleteSchedule.mutateAsync(item.id);
                                                        toast.success('Termin gelöscht');
                                                      } catch (error) {
                                                        toast.error('Fehler beim Löschen des Termins');
                                                        console.error('Delete schedule error:', error);
                                                      }
                                                    }
                                                  }}
                                                  disabled={deleteSchedule.isPending}
                                                  className="h-8 w-8 p-0 text-[#E74C3C] hover:bg-red-50 hover:text-[#E74C3C] rounded-xl flex-shrink-0 disabled:opacity-50"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Schedule Dialog */}
                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                  <DialogContent className="sm:max-w-[425px] p-0 gap-0" onInteractOutside={(e) => {
                    // Prevent closing when clicking on popovers
                    const target = e.target as HTMLElement;
                    if (target.closest('[data-radix-popper-content-wrapper]')) {
                      e.preventDefault();
                    }
                  }}>
                    <DialogHeader className="px-6 pt-6 pb-4">
                      <DialogTitle className="text-2xl font-heading font-bold text-[#13112B]">Neuer Schraubtermin</DialogTitle>
                      <DialogDescription className="text-base text-[#13112B]/60 mt-2">
                        Plane einen neuen Schraubtermin für einen Sektor
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 px-6 pb-6">
                      <div className="space-y-3">
                        <Label className="text-base font-semibold text-[#13112B]">Sektoren</Label>
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-[#E7F7E9] rounded-xl p-3">
                          {sectors && sectors.length > 0 ? (
                            sectors.map(sector => (
                              <div key={sector.id} className="flex items-center space-x-3 py-2">
                                <Checkbox
                                  id={`sector-${sector.id}`}
                                  checked={scheduleSectorIds.has(sector.id)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(scheduleSectorIds);
                                    if (checked) {
                                      newSet.add(sector.id);
                                    } else {
                                      newSet.delete(sector.id);
                                    }
                                    setScheduleSectorIds(newSet);
                                  }}
                                />
                                <label
                                  htmlFor={`sector-${sector.id}`}
                                  className="text-sm font-medium text-[#13112B] cursor-pointer flex-1"
                                >
                                  {sector.name}
                                </label>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[#13112B]/60 py-2">Keine Sektoren verfügbar</p>
                          )}
                        </div>
                        {scheduleSectorIds.size > 0 && (
                          <p className="text-xs text-[#13112B]/60">
                            {scheduleSectorIds.size} {scheduleSectorIds.size === 1 ? 'Sektor' : 'Sektoren'} ausgewählt
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label className="text-base font-semibold text-[#13112B]">Datum</Label>
                          <DatePickerPopover
                            selected={scheduleDate}
                            onSelect={setScheduleDate}
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 10}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-base font-semibold text-[#13112B]">Uhrzeit</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-12 w-full justify-start text-left font-normal border-[#E7F7E9] hover:bg-[#F9FAF9] text-base",
                                  !scheduleTime && "text-[#13112B]/40"
                                )}
                              >
                                <Clock className="mr-3 h-5 w-5 text-[#13112B]/60" />
                                {scheduleTime ? (
                                  scheduleTime
                                ) : (
                                  <span className="text-[#13112B]/40">--:--</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3 pr-5 border-[#E7F7E9] rounded-xl z-[200]" align="start">
                              <div className="flex items-center gap-3">
                                {/* Hours */}
                                <div className="flex flex-col items-center">
                                  <Label className="text-xs font-semibold text-[#13112B]/60 mb-2 uppercase tracking-wide">Stunden</Label>
                                  <ScrollArea className="h-36 w-14">
                                    <div className="space-y-1 pr-2">
                                      {Array.from({ length: 24 }, (_, i) => {
                                        const hour = i.toString().padStart(2, '0');
                                        const [currentHour] = scheduleTime?.split(':') || ['00'];
                                        const isSelected = currentHour === hour;
                                        return (
                                          <button
                                            key={hour}
                                            onClick={() => {
                                              const currentMinutes = scheduleTime?.split(':')[1] || '00';
                                              setScheduleTime(`${hour}:${currentMinutes}`);
                                            }}
                                            className={cn(
                                              "w-full h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                                              isSelected
                                                ? "bg-[#36B531] text-white"
                                                : "hover:bg-[#E7F7E9] text-[#13112B]"
                                            )}
                                          >
                                            {hour}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>
                                </div>
                                
                                {/* Separator */}
                                <div className="text-xl font-bold text-[#13112B]/40 pt-7">:</div>
                                
                                {/* Minutes */}
                                <div className="flex flex-col items-center">
                                  <Label className="text-xs font-semibold text-[#13112B]/60 mb-2 uppercase tracking-wide">Minuten</Label>
                                  <ScrollArea className="h-36 w-14">
                                    <div className="space-y-1 pr-2">
                                      {Array.from({ length: 60 }, (_, i) => {
                                        const minute = i.toString().padStart(2, '0');
                                        const [, currentMinute] = scheduleTime?.split(':') || ['00', '00'];
                                        const isSelected = currentMinute === minute;
                                        return (
                                          <button
                                            key={minute}
                                            onClick={() => {
                                              const currentHours = scheduleTime?.split(':')[0] || '00';
                                              setScheduleTime(`${currentHours}:${minute}`);
                                            }}
                                            className={cn(
                                              "w-full h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                                              isSelected
                                                ? "bg-[#36B531] text-white"
                                                : "hover:bg-[#E7F7E9] text-[#13112B]"
                                            )}
                                          >
                                            {minute}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-3 px-6 pb-6 pt-0 border-t border-[#E7F7E9]">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setScheduleDialogOpen(false);
                          setScheduleSectorIds(new Set());
                          setScheduleDate(undefined);
                          setScheduleTime('');
                        }}
                        className="flex-1 h-12 border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] rounded-xl text-base font-medium"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        onClick={scheduleNextSector}
                        disabled={scheduleSectorIds.size === 0 || !scheduleDate || !scheduleTime}
                        className="flex-1 h-12 bg-[#36B531] hover:bg-[#2da029] text-white rounded-xl text-base font-medium"
                      >
                        {scheduleSectorIds.size > 0 
                          ? `${scheduleSectorIds.size} ${scheduleSectorIds.size === 1 ? 'Termin' : 'Termine'} erstellen`
                          : 'Termin erstellen'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
        </main>

        {/* Mobile FABs for Status Management */}
      {view === 'status' && selectedBouldersForStatus.size > 0 && (
        <div className="md:hidden fixed right-4 bottom-[calc(104px+env(safe-area-inset-bottom,0px))] z-[100] flex items-center gap-3">
          <button
            aria-label="Auswahl abbrechen"
            className="w-14 h-14 rounded-xl bg-gray-700 text-white grid place-items-center shadow-xl hover:bg-gray-800 transition-all"
            onClick={() => setSelectedBouldersForStatus(new Set())}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            aria-label="Ausgewählte reinschrauben"
            className="w-14 h-14 rounded-xl bg-[#36B531] text-white grid place-items-center shadow-xl hover:bg-[#2da029] transition-all"
            onClick={async () => {
              const ids = Array.from(selectedBouldersForStatus);
              if (ids.length === 0) return;
              await bulkStatusUpdate.mutateAsync({ ids, status: 'haengt' });
              setSelectedBouldersForStatus(new Set());
              // Force refetch to update the UI
              window.location.reload();
            }}
            disabled={bulkStatusUpdate.isPending}
          >
            <CheckCircle className="w-6 h-6" />
          </button>
          <button
            aria-label="Ausgewählte rausschrauben"
            className="w-14 h-14 rounded-xl bg-[#36B531] text-white grid place-items-center shadow-xl hover:bg-[#2da029] transition-all"
            onClick={async () => {
              const ids = Array.from(selectedBouldersForStatus);
              if (ids.length === 0) return;
              await bulkStatusUpdate.mutateAsync({ ids, status: 'abgeschraubt' });
              setSelectedBouldersForStatus(new Set());
              // Force refetch to update the UI
              window.location.reload();
            }}
            disabled={bulkStatusUpdate.isPending}
          >
            <MinusCircle className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Mobile FABs for Edit/Delete Management */}
      {view === 'edit' && selectedBouldersForDelete.size > 0 && (
        <div className="md:hidden fixed right-4 bottom-[calc(104px+env(safe-area-inset-bottom,0px))] z-[100] flex items-center gap-3">
          <button
            aria-label="Auswahl abbrechen"
            className="w-14 h-14 rounded-xl bg-gray-700 text-white grid place-items-center shadow-xl hover:bg-gray-800 transition-all"
            onClick={() => setSelectedBouldersForDelete(new Set())}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            aria-label="Ausgewählte löschen"
            className="w-14 h-14 rounded-xl bg-[#E74C3C] text-white grid place-items-center shadow-xl hover:bg-[#c0392b] transition-all"
            disabled={deleteBoulder.isPending}
            onClick={async () => {
              const count = selectedBouldersForDelete.size;
              if (!confirm(`Wirklich ${count} ${count === 1 ? 'Boulder' : 'Boulder'} löschen? Die Beta-Videos werden ebenfalls gelöscht.`)) {
                return;
              }
              
              try {
                const ids = Array.from(selectedBouldersForDelete);
                let successCount = 0;
                let failCount = 0;
                
                for (const id of ids) {
                  try {
                    await deleteBoulder.mutateAsync(id);
                    successCount++;
                  } catch (error) {
                    console.error(`[Setter] Failed to delete boulder ${id}:`, error);
                    failCount++;
                  }
                }
                
                if (successCount > 0) {
                  toast.success(`${successCount} ${successCount === 1 ? 'Boulder' : 'Boulder'} erfolgreich gelöscht`);
                }
                if (failCount > 0) {
                  toast.error(`${failCount} ${failCount === 1 ? 'Boulder' : 'Boulder'} konnten nicht gelöscht werden`);
                }
                
                setSelectedBouldersForDelete(new Set());
              } catch (error) {
                console.error('[Setter] Bulk delete error:', error);
                toast.error('Fehler beim Löschen der Boulder');
              }
            }}
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      )}

        {/* Spacer for mobile only global nav */}
        <div className="h-24 md:h-0" />
        

        {/* Floating Action Button - Boulder hinzufügen (immer sichtbar) */}
        {/* Removed custom FAB, using BatchUpload internal button or standard flow */}
        </div>
      </div>
    </SetterTabTitleProvider>
  );
};

export default Setter;


