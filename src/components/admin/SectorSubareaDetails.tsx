import { Pencil, Plus, QrCode, Trash2 } from 'lucide-react';
import type { Sector } from '@/hooks/useSectors';
import { getAdminSectorLabel, type AdminSubarea } from '@/lib/sectorAreas';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function SectorSubareaDetails({ group, canCreate, onClose, onCreate, onEdit, onDelete, onQR }: {
  group: AdminSubarea<Sector>; canCreate: boolean; onClose: () => void;
  onCreate: () => void; onEdit: (sector: Sector) => void;
  onDelete: (sector: Sector) => void; onQR: () => void;
}) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent scrollLayout="contained" onCloseAutoFocus={event => event.preventDefault()} className="flex flex-col gap-0 p-0 sm:max-w-[560px]">
      <DialogHeader className="shrink-0 p-4 text-left sm:p-5"><DialogTitle>{group.name}</DialogTitle><DialogDescription>{group.boulderCount === null ? 'Boulderzahl nicht verfügbar' : `${group.boulderCount} aktive Boulder`} · {group.sectors.length} {group.sectors.length === 1 ? 'Kartenfläche' : 'Kartenflächen'}</DialogDescription></DialogHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-sans text-sm font-semibold">Zugehörige Flächen</h3>{canCreate && group.areaId && <Button type="button" variant="ghost" className="h-11 gap-1.5 px-2 text-xs" onClick={onCreate}><Plus className="h-4 w-4" />Fläche ergänzen</Button>}</div>
        {group.sectors.length > 1 && <p className="text-xs text-muted-foreground">Diese Flächen bilden auf der Karte einen gemeinsamen Teilbereich.</p>}
        <ul className="divide-y divide-border/60">
          {group.sectors.map((sector, index) => <li key={sector.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-kws-control bg-secondary">{sector.image_url ? <img src={sector.image_url} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-semibold">{index + 1}</span>}</span><div className="min-w-0 flex-1"><h4 className="break-words font-sans text-sm font-semibold">{sector.name}</h4><p className="mt-1 text-xs text-muted-foreground">{sector.boulder_count} Boulder zugeordnet</p></div><Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`${getAdminSectorLabel(sector)} bearbeiten`} onClick={() => onEdit(sector)}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${getAdminSectorLabel(sector)} löschen`} onClick={() => onDelete(sector)}><Trash2 className="h-4 w-4" /></Button></div>
            {sector.description && <p className="mt-2 break-words text-xs text-muted-foreground">{sector.description}</p>}
          </li>)}
        </ul>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border/60 p-4 sm:p-5"><Button type="button" variant="secondary" className="flex-1 gap-2" onClick={onQR}><QrCode className="h-4 w-4" />QR-Code</Button><Button type="button" className="flex-1" onClick={onClose}>Schließen</Button></div>
    </DialogContent>
  </Dialog>;
}
