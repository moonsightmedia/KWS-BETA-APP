import { useState, useMemo, useRef, useEffect } from "react";
import { useSectors, useCreateSector, useUpdateSector, useDeleteSector } from "@/hooks/useSectors";
import { useBoulders } from "@/hooks/useBoulders";
import { useSectorSchedule } from "@/hooks/useSectorSchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, MoreVertical, Calendar, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { uploadSectorImage, deleteSectorImage } from "@/integrations/supabase/storage";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export const SectorManagement = () => {
  const { data: sectors, isLoading } = useSectors();
  const { data: allBoulders } = useBoulders();
  const { data: schedule } = useSectorSchedule();
  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image_url: "",
    });
    setEditingSector(null);
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (sector: any) => {
    setEditingSector(sector);
    setFormData({
      name: sector.name,
      description: sector.description || "",
      image_url: sector.image_url || "",
    });
    setImagePreview(sector.image_url || null);
    setImageFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Ungültiger Dateityp. Erlaubt sind: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Datei zu groß. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // If editing and had an existing image, we'll delete it on save
    if (editingSector && formData.image_url) {
      setFormData({ ...formData, image_url: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Prepare data, ensuring empty strings are converted to null
      const data: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
<<<<<<< HEAD
        next_schraubtermin: formData.next_schraubtermin ? new Date(formData.next_schraubtermin).toISOString() : null,
        image_url: formData.image_url || null,
=======
        image_url: imageUrl || null,
>>>>>>> 240937ccae7728db48c062fdf0436bfc6d7321c0
      };

      // Remove undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === '') {
          data[key] = null;
        }
      });

      let sectorId: string;
      let imageUrl = formData.image_url;

      if (editingSector) {
        // Update existing sector
        sectorId = editingSector.id;
        
        // Delete old image if a new one is being uploaded
        if (imageFile && formData.image_url) {
          try {
            await deleteSectorImage(formData.image_url);
          } catch (error) {
            // Ignore deletion errors
            console.error('Error deleting old image:', error);
          }
        }

        // Upload new image if selected
        if (imageFile) {
          imageUrl = await uploadSectorImage(
            imageFile,
            sectorId,
            (progress) => setUploadProgress(progress)
          );
          data.image_url = imageUrl;
        }

        await updateSector.mutateAsync({ id: sectorId, ...data });
      } else {
        // Create new sector first (without image)
        const newSector = await createSector.mutateAsync(data);
        sectorId = newSector.id;

        // Upload image with the real sector ID
        if (imageFile) {
          try {
            imageUrl = await uploadSectorImage(
              imageFile,
              sectorId,
              (progress) => setUploadProgress(progress)
            );
            
            // Update sector with image URL
            await updateSector.mutateAsync({ 
              id: sectorId, 
              image_url: imageUrl 
            });
          } catch (error: any) {
            // If image upload fails, delete the sector that was just created
            console.error('Error uploading image:', error);
            try {
              await deleteSector.mutateAsync(sectorId);
            } catch (deleteError) {
              console.error('Error deleting sector after image upload failure:', deleteError);
            }
            throw new Error('Fehler beim Hochladen des Bildes: ' + (error.message || 'Unbekannter Fehler'));
          }
        }
      }
      
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingSector ? 'Sektor erfolgreich aktualisiert!' : 'Sektor erfolgreich erstellt!');
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error('Fehler: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      // Find the sector to delete its image
      const sectorToDelete = sectors?.find(s => s.id === deleteId);
      if (sectorToDelete?.image_url) {
        try {
          await deleteSectorImage(sectorToDelete.image_url);
        } catch (error) {
          // Log error but continue with sector deletion
          console.error('Error deleting sector image:', error);
        }
      }
      await deleteSector.mutateAsync(deleteId);
      setDeleteId(null);
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
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreibung des Sektors..."
                  className="w-full min-w-0"
                />
              </div>

              <div className="w-full min-w-0">
                <Label htmlFor="image">Sektor-Bild</Label>
                <div className="space-y-2 w-full min-w-0">
                  {imagePreview && (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                      <img 
                        src={imagePreview} 
                        alt="Vorschau" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <Input
                    ref={fileInputRef}
                    id="image"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageSelect}
                    disabled={isUploading}
                    className="cursor-pointer w-full min-w-0"
                  />
                  {isUploading && (
                    <div className="space-y-1">
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-muted-foreground">
                        Upload: {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Erlaubte Formate: JPEG, PNG, WebP, GIF (max. 10MB)
                  </p>
                </div>
              </div>

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsDialogOpen(false)}
            disabled={isUploading}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? "Wird hochgeladen..." : editingSector ? "Speichern" : "Erstellen"}
          </Button>
        </div>
      </form>
    );

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Desktop Dialog */}
      {!isMobile && (
        <div className="flex justify-end w-full min-w-0">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Neuer Sektor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full min-w-0">
              <DialogHeader>
                <DialogTitle>
                  {editingSector ? "Sektor bearbeiten" : "Neuer Sektor"}
                </DialogTitle>
                <DialogDescription>
                  {editingSector 
                    ? "Bearbeite die Details des Sektors" 
                    : "Erstelle einen neuen Sektor mit Name, Beschreibung und optionalem Bild"}
                </DialogDescription>
              </DialogHeader>
              {formContent}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Mobile Sheet with Floating Action Button */}
      {isMobile && (
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
                {editingSector ? "Sektor bearbeiten" : "Neuer Sektor"}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {formContent}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg shadow-soft bg-card overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <Table className="w-full min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead>Boulder</TableHead>
                <TableHead>Nächster Termin</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors?.map((sector) => (
                <TableRow key={sector.id}>
                  <TableCell className="font-medium">{sector.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{sector.description || "-"}</TableCell>
                  <TableCell>{(allBoulders || []).filter((b:any) => b.sector_id === sector.id && ((b as any).status === 'haengt' || (b as any).status == null)).length}</TableCell>
                  <TableCell>
                    {(() => {
                      // Hole den nächsten Termin aus sector_schedule
                      const next = (schedule || [])
                        .filter((s: any) => s.sector_id === sector.id && new Date(s.scheduled_at) > new Date())
                        .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
                      return next ? format(new Date(next.scheduled_at), "dd.MM.yyyy HH:mm") : "-";
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(sector)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(sector.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 w-full min-w-0">
        {sectors?.map((sector) => (
          <Card key={sector.id} className="shadow-soft w-full min-w-0">
            <CardContent className="p-4 w-full min-w-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">{sector.name}</h3>
                  {sector.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {sector.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(sector)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeleteId(sector.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  {(allBoulders || []).filter((b:any) => b.sector_id === sector.id && ((b as any).status === 'haengt' || (b as any).status == null)).length} Boulder
                </Badge>
                {(() => {
                  const next = (schedule || [])
                    .filter((s: any) => s.sector_id === sector.id && new Date(s.scheduled_at) > new Date())
                    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
                  return next ? (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(next.scheduled_at), "dd.MM.yy")}
                    </Badge>
                  ) : null;
                })()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sektor löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Boulder in diesem Sektor werden ebenfalls gelöscht.
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
