import { useState } from "react";
import { useSectors, useCreateSector, useUpdateSector, useDeleteSector } from "@/hooks/useSectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

export const SectorManagement = () => {
  const { data: sectors, isLoading } = useSectors();
  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    boulder_count: 0,
    next_schraubtermin: "",
    last_schraubtermin: "",
    image_url: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      boulder_count: 0,
      next_schraubtermin: "",
      last_schraubtermin: "",
      image_url: "",
    });
    setEditingSector(null);
  };

  const handleEdit = (sector: any) => {
    setEditingSector(sector);
    setFormData({
      name: sector.name,
      description: sector.description || "",
      boulder_count: sector.boulder_count,
      next_schraubtermin: sector.next_schraubtermin ? format(new Date(sector.next_schraubtermin), "yyyy-MM-dd'T'HH:mm") : "",
      last_schraubtermin: sector.last_schraubtermin ? format(new Date(sector.last_schraubtermin), "yyyy-MM-dd'T'HH:mm") : "",
      image_url: sector.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      next_schraubtermin: formData.next_schraubtermin || null,
      last_schraubtermin: formData.last_schraubtermin || null,
    };

    if (editingSector) {
      await updateSector.mutateAsync({ id: editingSector.id, ...data });
    } else {
      await createSector.mutateAsync(data);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteSector.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Neuer Sektor</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSector ? "Sektor bearbeiten" : "Neuer Sektor"}
              </DialogTitle>
            </DialogHeader>
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
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreibung des Sektors..."
                />
              </div>

              <div>
                <Label htmlFor="boulder_count">Anzahl Boulder</Label>
                <Input
                  id="boulder_count"
                  type="number"
                  min="0"
                  value={formData.boulder_count}
                  onChange={(e) => setFormData({ ...formData, boulder_count: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="last_schraubtermin">Letzter Schraubtermin</Label>
                  <Input
                    id="last_schraubtermin"
                    type="datetime-local"
                    value={formData.last_schraubtermin}
                    onChange={(e) => setFormData({ ...formData, last_schraubtermin: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="next_schraubtermin">Nächster Schraubtermin</Label>
                  <Input
                    id="next_schraubtermin"
                    type="datetime-local"
                    value={formData.next_schraubtermin}
                    onChange={(e) => setFormData({ ...formData, next_schraubtermin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image_url">Bild URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">
                  {editingSector ? "Speichern" : "Erstellen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg shadow-soft bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="min-w-[200px]">Beschreibung</TableHead>
                <TableHead className="min-w-[100px]">Boulder</TableHead>
                <TableHead className="min-w-[150px]">Nächster Termin</TableHead>
                <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors?.map((sector) => (
                <TableRow key={sector.id}>
                  <TableCell className="font-medium">{sector.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{sector.description || "-"}</TableCell>
                  <TableCell>{sector.boulder_count}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {sector.next_schraubtermin 
                      ? format(new Date(sector.next_schraubtermin), "dd.MM.yyyy HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
