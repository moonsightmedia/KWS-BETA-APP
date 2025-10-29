import { useState } from "react";
import { useBoulders, useCreateBoulder, useUpdateBoulder, useDeleteBoulder } from "@/hooks/useBoulders";
import { useSectors } from "@/hooks/useSectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, MoreVertical } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DEFAULT_COLORS = ['Grün', 'Gelb', 'Blau', 'Orange', 'Rot', 'Schwarz', 'Weiß', 'Lila'];
const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8];

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
  const createBoulder = useCreateBoulder();
  const updateBoulder = useUpdateBoulder();
  const deleteBoulder = useDeleteBoulder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBoulder, setEditingBoulder] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [availableColors, setAvailableColors] = useState<string[]>(DEFAULT_COLORS);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#000000");

  const [formData, setFormData] = useState({
    name: "",
    sector_id: "",
    difficulty: 1,
    color: "Grün",
    beta_video_url: "",
    note: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      sector_id: "",
      difficulty: 1,
      color: "Grün",
      beta_video_url: "",
      note: "",
    });
    setEditingBoulder(null);
    setShowColorPicker(false);
    setCustomColorName("");
    setCustomColorHex("#000000");
  };

  const handleAddCustomColor = () => {
    if (customColorName.trim() && customColorHex) {
      const newColorName = customColorName.trim();
      if (!availableColors.includes(newColorName)) {
        setAvailableColors([...availableColors, newColorName]);
        // Dynamically add to COLOR_MAP
        COLOR_MAP[newColorName] = {
          bg: '',
          border: '',
          hex: customColorHex
        };
        setFormData({ ...formData, color: newColorName });
      }
      setShowColorPicker(false);
      setCustomColorName("");
      setCustomColorHex("#000000");
    }
  };

  const handleEdit = (boulder: any) => {
    setEditingBoulder(boulder);
    setFormData({
      name: boulder.name,
      sector_id: boulder.sector_id,
      difficulty: boulder.difficulty,
      color: boulder.color,
      beta_video_url: boulder.beta_video_url || "",
      note: boulder.note || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBoulder) {
      await updateBoulder.mutateAsync({ id: editingBoulder.id, ...formData });
    } else {
      await createBoulder.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteBoulder.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sector">Sektor *</Label>
                <Select
                  value={formData.sector_id}
                  onValueChange={(value) => setFormData({ ...formData, sector_id: value })}
                  required
                >
                  <SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty">Schwierigkeit *</Label>
                  <Select
                    value={formData.difficulty.toString()}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((diff) => (
                        <SelectItem key={diff} value={diff.toString()}>
                          {diff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="color">Farbe *</Label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {availableColors.map((color) => {
                        const colorInfo = COLOR_MAP[color];
                        const isSelected = formData.color === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
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
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
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

              <div>
                <Label htmlFor="beta_video_url">Beta Video URL</Label>
                <Input
                  id="beta_video_url"
                  type="url"
                  value={formData.beta_video_url}
                  onChange={(e) => setFormData({ ...formData, beta_video_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="note">Notizen</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button type="submit">
            {editingBoulder ? "Speichern" : "Erstellen"}
          </Button>
        </div>
      </form>
    );

  return (
    <div className="space-y-4">
      {/* Desktop Dialog */}
      <div className="hidden md:flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Boulder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBoulder ? "Boulder bearbeiten" : "Neuer Boulder"}
              </DialogTitle>
            </DialogHeader>
            <FormContent />
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
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {editingBoulder ? "Boulder bearbeiten" : "Neuer Boulder"}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FormContent />
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
                <TableHead>Name</TableHead>
                <TableHead>Sektor</TableHead>
                <TableHead>Schwierigkeit</TableHead>
                <TableHead>Farbe</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boulders?.map((boulder) => {
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
                        onClick={() => handleEdit(boulder)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
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
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {boulders?.map((boulder) => {
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
                      <DropdownMenuItem onClick={() => handleEdit(boulder)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
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
                  <Badge variant="secondary">
                    Schwierigkeit {boulder.difficulty}
                  </Badge>
                  <div 
                    className={`w-6 h-6 rounded-full border-2 ${COLOR_MAP[boulder.color]?.bg || 'bg-gray-400'} ${COLOR_MAP[boulder.color]?.border || 'border-gray-500'}`}
                    title={boulder.color}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Boulder löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
