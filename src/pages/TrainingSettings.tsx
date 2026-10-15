import { Link } from 'react-router-dom';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TRAINING_UI_ENABLED } from '@/features/training/flags';
import { useTrainingPreferences } from '@/features/training/trainingPreferences';

export default function TrainingSettings() {
  const { trainingEnabled, kidsEnabled, setTrainingEnabled, setKidsEnabled, storageStatus } = useTrainingPreferences();
  return <DashboardPageLayout headerBackTo="/profile" headerBackLabel="Zurück zum Profil"><div className="max-w-2xl space-y-5">
    {TRAINING_UI_ENABLED ? <>
      <p className="text-sm leading-relaxed text-muted-foreground">Wähle, welche Trainingsbereiche du sehen möchtest. Deine Einheiten, Favoriten und dein Verlauf bleiben erhalten.</p>
      <KwsSurface className="divide-y divide-border">
        <div className="flex min-h-24 items-center gap-4 p-4"><div className="min-w-0 flex-1"><Label htmlFor="training-enabled" className="text-sm font-semibold">Training anzeigen</Label><p id="training-enabled-description" className="mt-1 text-xs leading-relaxed text-muted-foreground">Training in der Navigation und beim Seitenwischen einblenden.</p></div><Switch id="training-enabled" checked={trainingEnabled} onCheckedChange={setTrainingEnabled} aria-describedby="training-enabled-description" /></div>
        <div className="flex min-h-24 items-center gap-4 p-4"><div className="min-w-0 flex-1"><Label htmlFor="training-kids-enabled" className="text-sm font-semibold">Kinderbouldern anzeigen</Label><p id="training-kids-description" className="mt-1 text-xs leading-relaxed text-muted-foreground">Kinderspiele in Bibliothek und Favoriten anzeigen.{!trainingEnabled && ' Wird wirksam, sobald Training wieder eingeblendet ist.'}</p></div><Switch id="training-kids-enabled" checked={kidsEnabled} onCheckedChange={setKidsEnabled} aria-describedby="training-kids-description" /></div>
      </KwsSurface>
      {storageStatus === 'saved' ? <p className="text-xs leading-relaxed text-muted-foreground">Die Auswahl gilt für dein Konto auf diesem Gerät. Änderungen werden lokal gespeichert und von anderen App-Tabs dieses Browsers übernommen; andere Geräte werden nicht synchronisiert.</p> : <p role="alert" className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">Lokales Speichern oder Laden ist gerade nicht verfügbar. Die Auswahl gilt nur in diesem geöffneten App-Fenster.</p>}
      {trainingEnabled && <Button asChild variant="secondary"><Link to="/training">Training öffnen</Link></Button>}
    </> : <KwsSurface className="space-y-2 p-5"><h2 className="text-base font-semibold">Training ist noch nicht verfügbar</h2><p className="text-sm text-muted-foreground">Die Training-Vorschau ist in dieser App-Version nicht aktiviert.</p></KwsSurface>}
  </div></DashboardPageLayout>;
}
