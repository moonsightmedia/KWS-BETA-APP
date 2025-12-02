import { useState, useMemo, useCallback } from "react";
import { useBoulders, useCreateBoulder, useDeleteBoulder, useBouldersWithSectors, useDeleteAllBoulders } from "@/hooks/useBoulders";
import { toast } from "sonner";
import { useSectors, useSectorsTransformed } from "@/hooks/useSectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, MoreVertical, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Palette, Map, Dumbbell, X } from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { getColorBackgroundStyle } from "@/utils/colorUtils";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DEFAULT_COLORS = ['Grün', 'Gelb', 'Blau', 'Orange', 'Rot', 'Schwarz', 'Weiß', 'Lila'];
const DIFFICULTIES = [null, 1, 2, 3, 4, 5, 6, 7, 8]; // null = "?" (unknown/not rated)
const formatDifficulty = (d: number | null): string => d === null ? '?' : String(d);
const parseDifficulty = (value: string): number | null => value === '?' || value === 'null' ? null : parseInt(value, 10);

const COLOR_MAP: Record<string, { bg: string; border: string; hex: string }> = {
  'Grün': { bg: 'bg-green-500', border: 'border-green-600', hex: '#22c55e' },
  'Gelb': { bg: 'bg-yellow-400', border: 'border-yellow-500', hex: '#facc15' },
  'Blau': { bg: 'bg-blue-500', border: 'border-blue-600', hex: '#3b82f6' },
  'Orange': { bg: 'bg-orange-500', border: 'border-orange-600', hex: '#f97316' },
  'Rot': { bg: 'bg-red-500', border: 'border-red-600', hex: '#ef4444' },
  'Schwarz': { bg: 'bg-gray-900', border: 'border-gray-950', hex: '#111827' },
  'Weiß': { bg: 'bg-white', border: 'border-gray-300', hex: '#ffffff' },
  'Lila': { bg: 'bg-purple-500', border: 'border-purple-600', hex: '#a855f7' },
};

export const BoulderManagement = () => {
  const { data: boulders, isLoading } = useBoulders();
  const { data: sectors } = useSectors();
  const { data: sectorsTransformed } = useSectorsTransformed();
  const { data: colors } = useColors();
  const createBoulder = useCreateBoulder();
  const deleteBoulder = useDeleteBoulder();
  const deleteAllBoulders = useDeleteAllBoulders();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const [availableColors, setAvailableColors] = useState<string[]>(DEFAULT_COLORS);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#000000");
  const [isUploading, setIsUploading] = useState(false);

  // Such- und Filter-Funktionen
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sector' | 'difficulty' | 'created_at' | 'date'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Mobile floating filter bar state
  const [filterOpen, setFilterOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<null | 'sector' | 'difficulty' | 'color' | 'sort'>(null);

  // Gefilterte und sortierte Boulder
  const filteredAndSortedBoulders = useMemo(() => {
    if (!boulders || !sectors) return [];

    let filtered = boulders.filter((boulder) => {
      const sector = sectors.find(s => s.id === boulder.sector_id);
      
      // Suchfilter
      const matchesSearch = 
        boulder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sector?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        boulder.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
        boulder.difficulty.toString().includes(searchQuery) ||
        (boulder.note && boulder.note.toLowerCase().includes(searchQuery.toLowerCase()));

      // Sektor-Filter
      const matchesSector = sectorFilter === 'all' || sector?.name === sectorFilter;

      // Schwierigkeits-Filter
      const matchesDifficulty = difficultyFilter === 'all' || (boulder.difficulty === null ? '?' : String(boulder.difficulty)) === difficultyFilter;

      // Farb-Filter
      const matchesColor = colorFilter === 'all' || boulder.color === colorFilter;

      return matchesSearch && matchesSector && matchesDifficulty && matchesColor;
    });

    // Sortierung
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'name':
          result = a.name.localeCompare(b.name);
          break;
        case 'sector': {
          const sectorA = sectors.find(s => s.id === a.sector_id)?.name || '';
          const sectorB = sectors.find(s => s.id === b.sector_id)?.name || '';
          result = sectorA.localeCompare(sectorB);
          break;
        }
        case 'difficulty':
          result = a.difficulty - b.difficulty;
          break;
        case 'created_at':
        case 'date':
          result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? result : -result;
    });

    return filtered;
  }, [boulders, sectors, searchQuery, sectorFilter, difficultyFilter, colorFilter, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  const [formData, setFormData] = useState({
    name: "",
    sector_id: "",
    difficulty: 1,
    color: "Grün",
    beta_video_url: "",
    thumbnail_url: "",
    note: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      sector_id: "",
      difficulty: null,
      color: "Grün",
      beta_video_url: "",
      thumbnail_url: "",
      note: "",
    });
    setShowColorPicker(false);
    setCustomColorName("");
    setCustomColorHex("#000000");
  };

  const handleAddCustomColor = useCallback(() => {
    if (customColorName.trim() && customColorHex) {
      const newColorName = customColorName.trim();
      if (!availableColors.includes(newColorName)) {
        setAvailableColors((prev) => [...prev, newColorName]);
        // Dynamically add to COLOR_MAP
        COLOR_MAP[newColorName] = {
          bg: '',
          border: '',
          hex: customColorHex
        };
        setFormData((prev) => ({ ...prev, color: newColorName }));
      }
      setShowColorPicker(false);
      setCustomColorName("");
      setCustomColorHex("#000000");
    }
  }, [customColorName, customColorHex, availableColors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createBoulder.mutateAsync(formData);
    
    setIsDialogOpen(false);
    resetForm();
  }, [formData, createBoulder, resetForm]);

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteBoulder.mutateAsync(deleteId);
        // Only close dialog after successful deletion
        setDeleteId(null);
      } catch (error) {
        // Error is already handled by the hook's onError
        // Don't close dialog on error
      }
    }
  };

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  // Form content direkt inline rendern, um Focus-Probleme zu vermeiden
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
              <div className="w-full min-w-0">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full min-w-0"
                />
              </div>

              <div className="w-full min-w-0">
                <Label htmlFor="sector">Sektor *</Label>
                <Select
                  value={formData.sector_id}
                  onValueChange={(value) => setFormData({ ...formData, sector_id: value })}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sektor wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors?.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <div className="w-full min-w-0">
                  <Label htmlFor="difficulty">Schwierigkeit *</Label>
                  <Select
                    value={formData.difficulty === null ? '?' : String(formData.difficulty)}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: parseDifficulty(value) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((diff) => {
                        const dStr = diff === null ? '?' : String(diff);
                        return (
                          <SelectItem key={dStr} value={dStr}>
                            {formatDifficulty(diff)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full min-w-0">
                  <Label htmlFor="color">Farbe *</Label>
                  <div className="space-y-3 w-full min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
                      {availableColors.map((color) => {
                        const colorInfo = COLOR_MAP[color];
                        const isSelected = formData.color === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`relative flex flex-col items-center gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all w-full min-w-0 ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div 
                              className={`w-8 h-8 rounded-full border-2 ${colorInfo?.bg || ''} ${colorInfo?.border || ''}`}
                              style={!colorInfo?.bg ? { backgroundColor: colorInfo?.hex } : {}}
                            />
                            <span className="text-xs font-medium truncate w-full text-center">{color}</span>
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {!showColorPicker ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowColorPicker(true)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Neue Farbe hinzufügen
                      </Button>
                    ) : (
                      <div className="border rounded-lg p-4 space-y-3 w-full min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                          <div>
                            <Label htmlFor="colorName" className="text-xs">Farbname</Label>
                            <Input
                              id="colorName"
                              value={customColorName}
                              onChange={(e) => setCustomColorName(e.target.value)}
                              placeholder="z.B. Pink"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label htmlFor="colorPicker" className="text-xs">Farbe wählen</Label>
                            <Input
                              id="colorPicker"
                              type="color"
                              value={customColorHex}
                              onChange={(e) => setCustomColorHex(e.target.value)}
                              className="h-9 cursor-pointer"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowColorPicker(false);
                              setCustomColorName("");
                              setCustomColorHex("#000000");
                            }}
                            className="flex-1"
                          >
                            Abbrechen
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddCustomColor}
                            disabled={!customColorName.trim()}
                            className="flex-1"
                          >
                            Hinzufügen
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full min-w-0">
                <Label htmlFor="beta_video_url">Beta Video URL</Label>
                <Input
                  id="beta_video_url"
                  type="url"
                  value={formData.beta_video_url}
                  onChange={(e) => setFormData({ ...formData, beta_video_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full min-w-0"
                />
                <div className="mt-2 flex items-center gap-2 w-full min-w-0">
                  <input
                    id="beta_video_file"
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploading(true);
                        // Upload functionality removed
                        toast.error('Upload-Funktion wurde entfernt');
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error('Upload fehlgeschlagen', err);
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    className="flex-1 min-w-0"
                  />
                  {isUploading && <span className="text-xs text-muted-foreground flex-shrink-0">Lade hoch…</span>}
                </div>
                {formData.beta_video_url && (
                  <div className="mt-2 aspect-[9/16] w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                    <video src={formData.beta_video_url} controls muted className="w-full h-full object-cover" playsInline />
                  </div>
                )}
              </div>

              <div className="w-full min-w-0">
                <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Zeige die Startgriffe des Boulders. Dieses Bild wird in der Boulder-Liste angezeigt.
                </p>
                <Input
                  id="thumbnail_url"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full min-w-0"
                />
                <div className="mt-2 flex items-center gap-2 w-full min-w-0">
                  <input
                    id="thumbnail_file"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploading(true);
                        // Upload functionality removed
                        toast.error('Upload-Funktion wurde entfernt');
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error('Thumbnail-Upload fehlgeschlagen', err);
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    className="flex-1 min-w-0"
                  />
                  {isUploading && <span className="text-xs text-muted-foreground flex-shrink-0">Lade hoch…</span>}
                </div>
                {formData.thumbnail_url && (
                  <div className="mt-2 aspect-[9/16] w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                    <img src={formData.thumbnail_url} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="w-full min-w-0">
                <Label htmlFor="note">Notizen</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Zusätzliche Informationen..."
                  className="w-full min-w-0"
                />
              </div>

        <div className="flex justify-end gap-2 w-full min-w-0">
          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-shrink-0">
            Abbrechen
          </Button>
          <Button type="submit" className="flex-shrink-0">
            Erstellen
          </Button>
        </div>
      </form>
    );

  return (
    <div className="space-y-4">
      {/* Header with Delete All Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-teko tracking-wide">Boulder verwalten</h2>
        <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Alle Boulder löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alle Boulder löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion löscht alle Boulder aus der Datenbank. Die Videos bleiben im CDN erhalten und können später wieder verwendet werden.
                <br /><br />
                Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await deleteAllBoulders.mutateAsync();
                    setShowDeleteAllDialog(false);
                  } catch (error) {
                    // Error is handled by the hook
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Alle löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Boulder suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="flex-shrink-0">
              <Filter className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle className="font-teko text-2xl tracking-wide">Filter</SheetTitle>
              <SheetDescription>
                Filtere nach Sektor, Schwierigkeit und sortiere die Boulder
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sektor</label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger>
                    <SelectValue>
                      {sectorFilter === 'all' ? 'Alle Sektoren' : sectorFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Alle Sektoren</SelectItem>
                    {sectorsTransformed?.map((sector) => (
                      <SelectItem key={sector.id} value={sector.name}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Schwierigkeit</label>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger>
                    <SelectValue>
                      {difficultyFilter === 'all' ? 'Alle Schwierigkeiten' : `Schwierigkeit ${difficultyFilter}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Alle Schwierigkeiten</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((diff) => (
                      <SelectItem key={diff} value={diff.toString()}>
                        Schwierigkeit {diff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Farbe</label>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger>
                    <SelectValue>
                      {colorFilter === 'all' ? 'Alle Farben' : colorFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Alle Farben</SelectItem>
                    {(() => {
                      // Sammle alle einzigartigen Farben aus den Bouldern
                      const uniqueColors = new Set<string>();
                      boulders?.forEach(b => uniqueColors.add(b.color));
                      const sortedColors = Array.from(uniqueColors).sort();
                      
                      return sortedColors.map((color) => {
                        const colorInfo = COLOR_MAP[color];
                        return (
                          <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-4 h-4 rounded-full border ${colorInfo?.bg || ''} ${colorInfo?.border || ''}`}
                                style={!colorInfo?.bg ? { backgroundColor: colorInfo?.hex || '#9ca3af' } : {}}
                              />
                              {color}
                            </div>
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sortierung</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={sortBy === 'date' ? 'created_at' : sortBy} onValueChange={(value: any) => {
                      setSortBy(value === 'created_at' ? 'date' : value);
                    }}>
                      <SelectTrigger>
                        <SelectValue>
                          {sortBy === 'date' || sortBy === 'created_at' ? 'Datum' : sortBy === 'name' ? 'Name' : sortBy === 'difficulty' ? 'Schwierigkeit' : 'Sektor'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="created_at">Datum</SelectItem>
                        <SelectItem value="difficulty">Schwierigkeit</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="sector">Sektor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {filteredAndSortedBoulders.length} von {boulders?.length || 0} Bouldern gefunden
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Dialog */}
      <div className="hidden md:flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Boulder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full min-w-0 max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>
                Neuer Boulder
              </DialogTitle>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile Sheet with Floating Action Button */}
      <div className="md:hidden">
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetTrigger asChild>
            <Button 
              onClick={resetForm} 
              size="icon" 
              className="fixed bottom-[calc(104px+env(safe-area-inset-bottom))] right-6 z-[60] h-12 w-12 rounded-full shadow-lg"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-full">
            <SheetHeader>
              <SheetTitle>
                Neuer Boulder
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 w-full min-w-0 px-1">
              {formContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg shadow-soft bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Name
                    {getSortIcon('name')}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('sector')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Sektor
                    {getSortIcon('sector')}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('difficulty')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Schwierigkeit
                    {getSortIcon('difficulty')}
                  </button>
                </TableHead>
                <TableHead>Farbe</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedBoulders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'Keine Boulder gefunden.' : 'Keine Boulder vorhanden.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedBoulders.map((boulder) => {
                  const sector = sectors?.find(s => s.id === boulder.sector_id);
                  return (
                    <TableRow key={boulder.id}>
                      <TableCell className="font-medium">{boulder.name}</TableCell>
                      <TableCell>{sector?.name || "Unbekannt"}</TableCell>
                      <TableCell>{boulder.difficulty}</TableCell>
                      <TableCell>
                        <div 
                          className={`w-6 h-6 rounded-full border-2 ${COLOR_MAP[boulder.color]?.bg || 'bg-gray-400'} ${COLOR_MAP[boulder.color]?.border || 'border-gray-500'}`}
                          title={boulder.color}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(boulder.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredAndSortedBoulders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'Keine Boulder gefunden.' : 'Keine Boulder vorhanden.'}
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedBoulders.map((boulder) => {
            const sector = sectors?.find(s => s.id === boulder.sector_id);
            return (
              <Card key={boulder.id} className="shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{boulder.name}</h3>
                      <p className="text-sm text-muted-foreground">{sector?.name || "Unbekannt"}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(boulder.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary">Schwierigkeit {boulder.difficulty}</Badge>
                    <div 
                      className={`w-6 h-6 rounded-full border-2 ${COLOR_MAP[boulder.color]?.bg || 'bg-gray-400'} ${COLOR_MAP[boulder.color]?.border || 'border-gray-500'}`}
                      title={boulder.color}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Quick Filter Bar (mobile) */}
      {quickFilter && (
        <div className="md:hidden fixed left-4 right-4 bottom-24 z-[100] bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs px-2 py-1 rounded-full border bg-card">
              {quickFilter === 'color' ? 'Farbe' : quickFilter === 'sector' ? 'Sektor' : quickFilter === 'difficulty' ? 'Schwierigkeit' : 'Sortierung'}
            </span>
            <Button variant="ghost" size="icon" onClick={()=> setQuickFilter(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="w-full scrollbar-hide">
            <div className={cn(
              "flex items-center gap-2 px-3 pb-3 min-w-max",
              quickFilter === 'color' && "py-2"
            )}>
              {quickFilter === 'sector' && (
                <>
                  <Button variant={sectorFilter==='all'?'default':'outline'} size="sm" onClick={()=> setSectorFilter('all')}>Alle</Button>
                  {sectors?.map(s => (
                    <Button key={s.id} variant={sectors.find(x=>x.name===sectorFilter)?.id===s.id?'default':'outline'} size="sm" onClick={()=> setSectorFilter(s.name)}>
                      {s.name}
                    </Button>
                  ))}
                </>
              )}
              {quickFilter === 'difficulty' && (
                <>
                  <Button variant={difficultyFilter==='all'?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter('all')}>Alle</Button>
                  {DIFFICULTIES.map(d => {
                    const dStr = d === null ? '?' : String(d);
                    return (
                      <Button key={dStr} variant={difficultyFilter===dStr?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter(dStr)}>
                        {formatDifficulty(d)}
                      </Button>
                    );
                  })}
                </>
              )}
              {quickFilter === 'color' && (
                <>
                  <Button variant={colorFilter==='all'?'default':'outline'} size="sm" onClick={()=> setColorFilter('all')}>Alle</Button>
                  {colors?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(c => (
                    <Button 
                      key={c.name} 
                      variant="outline" 
                      size="sm" 
                      onClick={()=> setColorFilter(c.name)}
                      className={cn(
                        "w-10 h-10 rounded-full p-0 flex items-center justify-center border-2 transition-all",
                        colorFilter === c.name 
                          ? "border-primary shadow-lg scale-110" 
                          : "border-border hover:border-primary/50 hover:scale-105"
                      )}
                      title={c.name}
                    >
                      <span 
                        className="w-6 h-6 rounded-full"
                        style={getColorBackgroundStyle(c.name, colors)}
                      >
                        {colorFilter === c.name && (
                          <div className="w-full h-full rounded-full bg-white/90 shadow-sm" />
                        )}
                      </span>
                    </Button>
                  ))}
                </>
              )}
              {quickFilter === 'sort' && (
                <>
                  <Button 
                    variant={sortBy==='created_at' || sortBy==='date'?'default':'outline'} 
                    size="sm" 
                    onClick={()=> setSortBy('created_at')}
                  >
                    Datum
                  </Button>
                  <Button 
                    variant={sortBy==='name'?'default':'outline'} 
                    size="sm" 
                    onClick={()=> setSortBy('name')}
                  >
                    Name
                  </Button>
                  <Button 
                    variant={sortBy==='difficulty'?'default':'outline'} 
                    size="sm" 
                    onClick={()=> setSortBy('difficulty')}
                  >
                    Schwierigkeit
                  </Button>
                  <Button 
                    variant={sortBy==='sector'?'default':'outline'} 
                    size="sm" 
                    onClick={()=> setSortBy('sector')}
                  >
                    Sektor
                  </Button>
                  <div className="h-6 w-px bg-border mx-1" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={()=> setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1"
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                  </Button>
                </>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Floating Filter Bar (mobile) */}
      <nav className="md:hidden fixed bottom-28 left-4 right-4 z-[100] bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <span className="text-xs px-3 py-1 rounded-full border bg-card">{filteredAndSortedBoulders.length} Treffer</span>
          <div className="flex items-center gap-2">
            <Button 
              aria-label="Farben filtern" 
              variant={quickFilter === 'color' ? 'default' : 'outline'} 
              size="icon" 
              onClick={()=> setQuickFilter(prev => prev === 'color' ? null : 'color')}
            >
              <Palette className="w-5 h-5" />
            </Button>
            <Button 
              aria-label="Sektor filtern" 
              variant={quickFilter === 'sector' ? 'default' : 'outline'} 
              size="icon" 
              onClick={()=> setQuickFilter(prev => prev === 'sector' ? null : 'sector')}
            >
              <Map className="w-5 h-5" />
            </Button>
            <Button 
              aria-label="Schwierigkeit filtern" 
              variant={quickFilter === 'difficulty' ? 'default' : 'outline'} 
              size="icon" 
              onClick={()=> setQuickFilter(prev => prev === 'difficulty' ? null : 'difficulty')}
            >
              <Dumbbell className="w-5 h-5" />
            </Button>
            <Button 
              variant={quickFilter === 'sort' ? 'default' : 'outline'} 
              size="icon" 
              onClick={()=> setQuickFilter(prev => prev === 'sort' ? null : 'sort')}
              aria-label="Sortierung"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Boulder löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Beta-Video wird ebenfalls gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoulder.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteBoulder.isPending}
            >
              {deleteBoulder.isPending ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
