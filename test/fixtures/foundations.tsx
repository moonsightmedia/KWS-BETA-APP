// Presentation-only fixture: no auth, persistence or production data.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { SetterSurface, SetterSubsection } from '@/components/setter/SetterWorkspaceShell';
import '@/index.css';

export function Foundations() {
  const [checked, setChecked] = useState(false);
  return <main className="mx-auto min-h-screen max-w-4xl space-y-5 bg-canvas p-4 sm:p-8">
    <h1 className="text-3xl">Designsystem</h1>
    <Tabs defaultValue="one"><TabsList className="flex h-auto"><TabsTrigger value="one" className="flex-1">Übersicht</TabsTrigger><TabsTrigger value="two" className="flex-1">Einstellungen</TabsTrigger></TabsList></Tabs>
    <Card data-testid="card">
      <CardHeader><CardTitle>Farben und Bedienung</CardTitle><CardDescription data-testid="secondary-text">Lesbare Hinweise auf einer hellen Fläche.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" placeholder="Bouldername" /></div>
        <div className="space-y-2"><Label htmlFor="notes">Notiz</Label><Textarea id="notes" placeholder="Optionale Notiz" /></div>
        <Select defaultValue="all"><SelectTrigger aria-label="Bereich"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alle Bereiche</SelectItem><SelectItem value="sector">Ein Sektor</SelectItem></SelectContent></Select>
        <div className="flex min-h-11 items-center justify-between gap-4"><Label htmlFor="active">Aktiv</Label><Switch id="active" checked={checked} onCheckedChange={setChecked} /></div>
        <div className="flex flex-wrap gap-2"><Badge data-testid="badge">Hängt</Badge><Badge variant="secondary">Entwurf</Badge><Badge variant="destructive">Fehler</Badge></div>
        <div className="flex flex-wrap gap-2"><Button>Speichern</Button><Button variant="outline">Abbrechen</Button><Button variant="destructive">Entfernen</Button><Button disabled>Deaktiviert</Button></div>
      </CardContent>
    </Card>
    <SetterSurface><SetterSubsection title="Terminplanung" description="Gleiche Schrift und Abstände im Setterbereich."><p data-testid="setter-text" className="text-sm text-muted-foreground">Auch kleine Statushinweise bleiben gut lesbar.</p></SetterSubsection></SetterSurface>
    <Dialog><DialogTrigger asChild><Button variant="outline">Dialog öffnen</Button></DialogTrigger><DialogContent className="space-y-4 p-4 sm:max-w-md sm:p-5"><DialogHeader><DialogTitle>Vorschau</DialogTitle><DialogDescription>Einheitliche Rundungen und lesbare Texte.</DialogDescription></DialogHeader><DialogClose asChild><Button>Schließen</Button></DialogClose></DialogContent></Dialog>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Foundations />);
