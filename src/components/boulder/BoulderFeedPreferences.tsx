import { EyeOff, Target, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FeedDoubleTapAction } from '@/hooks/useBoulderFeedPreferences';

export function BoulderFeedPreferences({ open, onOpenChange, action, onAction, signedIn, returnFocus }: {
  open: boolean; onOpenChange: (open: boolean) => void; action: FeedDoubleTapAction;
  onAction: (action: FeedDoubleTapAction) => void; signedIn: boolean;
  returnFocus: HTMLElement | null;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="kws-feed-sheet" data-compact="true" data-panel="preferences" overlayClassName="kws-feed-overlay" scrollLayout="contained"
      onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus({ preventScroll: true }); }}>
      <div className="sheet-handle"/>
      <header className="sheet-header"><div><DialogTitle>Bedienung</DialogTitle><DialogDescription>Deine Auswahl gilt auf diesem Gerät.</DialogDescription></div><DialogClose asChild><Button variant="secondary" size="icon" aria-label="Schließen"><X/></Button></DialogClose></header>
      <div className="sheet-body">
        <h2 id="feed-double-tap-label" className="feed-preference-title">Doppeltipp auf das Video</h2>
        <RadioGroup aria-labelledby="feed-double-tap-label" value={action} onValueChange={value => onAction(value as FeedDoubleTapAction)} className="feed-preferences">
          {([
            { value: 'off', title: 'Aus', description: 'Keine zusätzliche Doppeltipp-Aktion.', icon: X },
            { value: 'project', title: 'Als Projekt speichern', description: signedIn ? 'Markiert den Boulder als Projekt. Erneutes Doppeltippen entfernt ihn nicht.' : 'Nach der Anmeldung verfügbar.', icon: Target },
            { value: 'layout', title: 'Layout ausblenden', description: 'Blendet die Bedienung aus oder wieder ein.', icon: EyeOff },
          ] as const).map(option => <label key={option.value} className="feed-preference" data-selected={action === option.value} data-disabled={option.value === 'project' && !signedIn}>
            <option.icon size={20}/><span><strong>{option.title}</strong><small>{option.description}</small></span>
            <RadioGroupItem value={option.value} disabled={option.value === 'project' && !signedIn} aria-label={option.title}/>
          </label>)}
        </RadioGroup>
        <p className="feed-preference-hint">Einmal tippen pausiert das Video. Über das Auge kannst du die Bedienung jederzeit ausblenden.</p>
      </div>
      <footer className="sheet-footer"><DialogClose asChild><Button className="save-track">Zurück zum Video</Button></DialogClose></footer>
    </DialogContent>
  </Dialog>;
}
