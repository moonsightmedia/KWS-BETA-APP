import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ExternalLink, Info, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTraining } from '@/features/training/TrainingContext';
import { getExercise } from '@/features/training/data';
import type { TrainingExercise, TrainingSession } from '@/features/training/types';

const acknowledged = new Set<string>();
const introKey = (accountId: string) => `kws-training-onboarding-v1:${accountId}`;
function hasSeenIntro(accountId: string) {
  if (acknowledged.has(accountId)) return true;
  try {
    const saved = JSON.parse(localStorage.getItem(introKey(accountId)) ?? 'null');
    return saved?.version === 1 && saved?.dismissed === true;
  } catch { return false; }
}
function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details open={open} className="group border-t border-border/70"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">{title}<ChevronDown className="h-4 w-4 shrink-0 group-open:rotate-180" aria-hidden="true" /></summary><div className="space-y-3 pb-4 text-sm leading-relaxed text-muted-foreground">{children}</div></details>;
}

export default function TrainingHelp({ exercise, session }: { exercise?: TrainingExercise; session?: TrainingSession }) {
  const { accountId, storageStatus, clearSavedTraining } = useTraining();
  const [mode, setMode] = useState<'intro' | 'help' | null>(() => hasSeenIntro(accountId) ? null : 'intro');
  const [step, setStep] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [introSaved, setIntroSaved] = useState(true);
  const [replay, setReplay] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const finishIntro = () => {
    acknowledged.add(accountId);
    try { localStorage.setItem(introKey(accountId), JSON.stringify({ version: 1, dismissed: true })); }
    catch { setIntroSaved(false); }
    setMode(null);
  };
  const close = () => { if (mode === 'intro') finishIntro(); else setMode(null); setConfirmClear(false); };
  useEffect(() => {
    const acknowledgeOtherTab = (event: StorageEvent) => {
      if (event.key === introKey(accountId) && hasSeenIntro(accountId) && !replay) setMode(previous => previous === 'intro' ? null : previous);
    };
    window.addEventListener('storage', acknowledgeOtherTab);
    return () => window.removeEventListener('storage', acknowledgeOtherTab);
  }, [accountId, replay]);
  const startIntro = () => { setStep(0); setReplay(true); setConfirmClear(false); setMode('intro'); };
  return <Dialog open={mode !== null} onOpenChange={open => { if (open) { setMode('help'); setConfirmClear(false); } else close(); }}>
    <DialogTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Traininginformationen" title="Traininginformationen"><Info className="h-5 w-5" aria-hidden="true" /></Button></DialogTrigger>
    <DialogContent scrollLayout="contained" className="flex max-h-[85dvh] flex-col overflow-hidden p-0 sm:max-w-xl" data-compact={mode === 'intro'} data-swipe-ignore onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }}>
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4"><div className="space-y-1"><DialogTitle ref={titleRef} tabIndex={-1} className="outline-none">{mode === 'intro' ? 'Dein Training, kurz erklärt' : 'Traininginformationen'}</DialogTitle><DialogDescription>{mode === 'intro' ? `Schritt ${step + 1} von 2` : exercise ? exercise.title : session ? session.title : 'Hilfe, Hinweise und Quellen'}</DialogDescription></div><Button type="button" variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0" aria-label={mode === 'intro' ? 'Einführung schließen' : 'Informationen schließen'} onClick={close}><X aria-hidden="true" /></Button></header>
      {mode === 'intro' ? <>
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-5" aria-live="polite">
          <div className="flex gap-2" aria-hidden="true">{[0, 1].map(index => <span key={index} className={`h-1 flex-1 rounded-kws-badge ${index === step ? 'bg-primary' : 'bg-secondary'}`} />)}</div>
          <h3 className="text-lg font-semibold">{step === 0 ? 'Übungen für deine Einheit sammeln' : 'Aus der Auswahl wird deine Einheit'}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{step === 0 ? 'Tippe bei einer Übung auf „Zur Einheit hinzufügen“. Sie landet in deinem Entwurf. Du kannst weiter durch die Übungen stöbern.' : 'Tippe bei deiner Auswahl auf „Einheit öffnen“. Passe Reihenfolge, Sätze und Pausen an, gib der Einheit einen Namen und speichere sie.'}</p>
          {step === 0 ? <div className="space-y-3 rounded-kws-control bg-secondary/60 p-4" aria-label="Beispiel: Übung sammeln"><p className="text-xs text-muted-foreground">Beispiel</p><p className="text-sm font-semibold">Erhöhter Liegestütz</p><span className="inline-flex min-h-11 items-center gap-2 rounded-kws-control bg-primary px-3 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" aria-hidden="true" />Zur Einheit hinzufügen</span><p className="text-xs text-muted-foreground">Noch kein Training gestartet — nur ausgewählt.</p></div> : <div className="flex flex-wrap items-center justify-between gap-3 rounded-kws-control bg-foreground p-4 text-white" aria-label="Beispiel: Entwurf öffnen"><p className="text-sm font-semibold">2 Übungen im Entwurf</p><span className="inline-flex min-h-11 items-center rounded-kws-control bg-primary px-3 text-sm font-semibold text-primary-foreground">Einheit öffnen</span></div>}
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{step === 0 ? 'Kinderspiele und Hinweise bei Beschwerden sind eigene Inhalte. Du kannst sie ansehen und als Favorit merken.' : 'Gespeicherte Einheiten findest du unter „Eigene Einheiten“. Auf Wunsch planst du sie in deine Woche ein. Alle Erklärungen findest du oben beim „i“.'}</p>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4"><Button type="button" variant="ghost" className="px-2 text-sm" onClick={step === 0 ? finishIntro : () => setStep(0)}>{step === 0 ? 'Überspringen' : 'Zurück'}</Button><Button type="button" onClick={step === 0 ? () => setStep(1) : finishIntro}>{step === 0 ? 'Weiter' : 'Los geht’s'}</Button></footer>
      </> : <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-4">
        {exercise && <Section title="Hinweise zu dieser Übung" open><p>{exercise.note}</p>{exercise.kidsGuide && <><h3 className="font-semibold text-foreground">Betreuung</h3><p>{exercise.kidsGuide.supervision}</p></>}<ul className="space-y-2">{exercise.cues?.map(text => <li key={text}>{text}</li>)}{exercise.mistakes?.map(text => <li key={text}>Vermeiden: {text}</li>)}</ul>{exercise.defaultDose && <p>Der Umfang ist ein Beispiel. Du kannst ihn in deiner Einheit anpassen.</p>}</Section>}
        <Section title="Übungen auswählen & Einheit speichern" open={!exercise && !session}><p>„Zur Einheit hinzufügen“ sammelt Übungen im Entwurf. Unter „Einheit öffnen“ kannst du Reihenfolge und Umfang anpassen und die Einheit speichern.</p><p>Öffnest du die Bibliothek aus einer gespeicherten Einheit, ergänzt „Hinzufügen“ diese Einheit direkt. „Übung ersetzen“ tauscht die ausgewählte Übung aus.</p><p>Gespeicherte Einheiten stehen unter „Eigene Einheiten“. Dort kannst du sie in deine Woche einplanen oder als trainiert markieren.</p><p>Suche nach einem Thema oder einer Übung. Filter grenzen die Auswahl ein. Mit dem Stern merkst du Inhalte als Favorit.</p></Section>
        {session && <Section title="Hinweise zu dieser Einheit"><p>{session.rationale}</p><p>Die geschätzte Dauer berücksichtigt deinen Umfang, Pausen, Vorbereitung und Abschluss. Pausen gelten wie bei der jeweiligen Übung angegeben; nimm bei Bedarf mehr Zeit.</p><ul className="space-y-3">{session.exercises.map(item => { const selected = getExercise(item.exerciseId); return selected && (item.reason || selected.selectionReason) ? <li key={item.id}><span className="font-semibold text-foreground">{selected.title}: </span>{item.reason || selected.selectionReason}</li> : null; })}</ul></Section>}
        <Section title="Kinder, Mobilität & Beschwerden"><p>Kinderspiele sind für betreute Gruppen gedacht. Alter, Gruppengröße und Spielzeit dienen zur Orientierung; beachte Aufbau und Betreuung beim jeweiligen Spiel.</p><p>„Mobilität & Dehnen“ enthält Bewegungs- und Dehnübungen. „Bei Beschwerden“ hilft, Beobachtungen für ein Gespräch mit einer Fachperson zu sammeln; es ist kein individueller Therapieplan.</p></Section>
        <Section title="Hintergrund & Quellen"><p>Die Trainingsinhalte und Beispielpläne sind noch nicht fachlich freigegeben. Quellen stützen Grundlagen; konkrete Abläufe und Beispielumfänge sind redaktionell. Der Plan-Assistent nutzt lokale Auswahlregeln.</p>{exercise?.selectionReason && <p>{exercise.selectionReason}</p>}{exercise && <ul className="space-y-3">{exercise.sources.map(source => <li key={source.url + source.label}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-ink underline underline-offset-4">{source.label}<ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="sr-only"> (öffnet in neuem Tab)</span></a><p className="text-xs">{source.context}</p></li>)}</ul>}</Section>
        <Section title="Speicherung & Einführung"><p>{storageStatus === 'saved' ? 'Plan, Einheiten und Favoriten werden auf diesem Gerät je Konto gespeichert. Angaben zu Alter und Beschwerden werden nicht gespeichert.' : 'Speichern ist in diesem Browser nicht möglich. Änderungen bleiben nur in dieser Sitzung.'}</p>{!introSaved && <p>Die Einführung konnte nicht dauerhaft gespeichert werden. Nach einem Neustart kann sie erneut erscheinen.</p>}<Button type="button" variant="secondary" className="h-auto min-h-11 whitespace-normal" onClick={startIntro}>Einführung erneut ansehen</Button><Button type="button" variant="ghost" className="h-auto min-h-11 whitespace-normal px-0 text-left text-xs text-destructive" onClick={() => confirmClear ? (clearSavedTraining(), setConfirmClear(false)) : setConfirmClear(true)}>{confirmClear ? 'Lokale Trainingsdaten jetzt löschen' : 'Lokale Trainingsdaten zurücksetzen'}</Button></Section>
      </div>}
    </DialogContent>
  </Dialog>;
}
