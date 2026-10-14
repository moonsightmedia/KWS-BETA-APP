import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const candidates = [
  { id: 'areas', title: 'Deinen Bereich wählen', text: 'Hier findest du Kraft, Boulderaufgaben, Mobilität und betreute Kinderspiele.' },
  { id: 'search', title: 'Die passende Übung finden', text: 'Suche nach einer Übung oder einem Thema, zum Beispiel Brust oder Fußtechnik.' },
  { id: 'filter', title: 'Die Auswahl eingrenzen', text: 'Mit dem Filter wählst du zum Beispiel das verfügbare Material oder dein Erfahrungsniveau.' },
  { id: 'tabs', title: 'Die Übung kennenlernen', text: 'Wechsle zwischen Anleitung, Umfang und Varianten. Bei Kinderspielen findest du hier Ablauf und Aufbau.' },
  { id: 'add', title: 'Übungen sammeln', text: '„Zur Einheit hinzufügen“ sammelt Übungen im Entwurf. Mit „Einheit öffnen“ passt du Reihenfolge und Umfang an und speicherst deine Einheit.' },
  { id: 'favorite', title: 'Für später merken', text: 'Mit dem Stern findest du diese Übung oder dieses Spiel unter deinen Favoriten wieder.' },
  { id: 'selection', title: 'Deinen Entwurf öffnen', text: 'Hier öffnest du deine Auswahl, ordnest die Übungen und passt ihren Umfang an.' },
  { id: 'units', title: 'Deine Einheiten wiederfinden', text: 'Hier stehen deine gespeicherten Einheiten. Auch einen begonnenen Entwurf kannst du hier fortsetzen.' },
  { id: 'assistant', title: 'Deine Woche planen', text: 'Der Plan-Assistent führt dich durch die Fragen zu deiner Trainingswoche.' },
  { id: 'save', title: 'Deine Einheit speichern', text: 'Gib der Einheit einen Namen und prüfe ihren Umfang. Nach dem Speichern kannst du sie in deine Woche einplanen.' },
  { id: 'info', title: 'Hilfe jederzeit öffnen', text: 'Beim „i“ findest du Erklärungen, Übungshinweise und Quellen. Hier kannst du diese Tour auch erneut starten.' },
];
type TourStep = typeof candidates[number];
const targetFor = (id: string) => [...document.querySelectorAll<HTMLElement>(`[data-training-tour="${id}"]`)].find(element => element.getClientRects().length > 0);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export default function TrainingTour({ onFinish }: { onFinish: () => void }) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [geometry, setGeometry] = useState<{ x: number; y: number; width: number; height: number; top: number; left: number; arrow: number; above: boolean } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const initialScroll = useRef(window.scrollY);
  const step = steps[index];
  const positioned = geometry !== null;
  useEffect(() => { if (positioned) title.current?.focus({ preventScroll: true }); }, [step, positioned]);
  useEffect(() => {
    setSteps(candidates.filter(candidate => Boolean(targetFor(candidate.id))).map(candidate => {
      if (candidate.id !== 'add') return candidate;
      const label = targetFor('add')?.textContent ?? '';
      if (label.includes('ersetzen')) return { ...candidate, title: 'Eine Übung austauschen', text: 'Hier ersetzt du die gewählte Übung in deiner gespeicherten Einheit.' };
      if (label.includes('In dieser Einheit')) return { ...candidate, text: 'Diese Übung ist bereits in deiner Einheit. Mit „Einheit ansehen“ kommst du zurück.' };
      if (label.includes('Im Einheitsentwurf')) return { ...candidate, text: 'Diese Übung ist schon ausgewählt. Öffne deinen Entwurf, um den Umfang anzupassen und die Einheit zu speichern.' };
      if (new URLSearchParams(window.location.search).has('append')) return { ...candidate, title: 'Deine Einheit ergänzen', text: 'Hier fügst du die Übung direkt zu deiner gespeicherten Einheit hinzu.' };
      return candidate;
    }));
    const scroll = initialScroll.current;
    return () => { window.scrollTo({ top: scroll, behavior: 'instant' }); document.querySelector<HTMLElement>('[data-training-tour="info"]')?.focus({ preventScroll: true }); };
  }, []);
  useLayoutEffect(() => {
    if (!step) return;
    let frame = 0;
    const measure = () => {
      const target = targetFor(step.id) ?? targetFor('info');
      if (!target || !panel.current) return;
      const rect = target.getBoundingClientRect();
      const viewport = window.visualViewport;
      const offset = viewport?.offsetTop ?? 0;
      const bottom = offset + (viewport?.height ?? window.innerHeight);
      const width = window.innerWidth;
      const box = panel.current.getBoundingClientRect();
      const x = clamp(rect.left - 5, 8, width - 8);
      const y = clamp(rect.top - 5, offset + 8, bottom - 8);
      const highlightWidth = Math.min(rect.width + 10, width - x - 8);
      const highlightHeight = Math.max(0, Math.min(rect.bottom + 5, bottom - 8) - y);
      const above = y - box.height - 14 >= offset + 12;
      if (!above && y + highlightHeight + box.height + 14 > bottom - 12 && highlightHeight + box.height + 38 < bottom - offset) {
        const desiredTop = bottom - box.height - highlightHeight - 26;
        const before = window.scrollY;
        window.scrollBy({ top: y - desiredTop, behavior: 'instant' });
        if (window.scrollY !== before) { schedule(); return; }
      }
      const top = clamp(above ? y - box.height - 14 : y + highlightHeight + 14, offset + 12, bottom - box.height - 12);
      const left = clamp(rect.left + rect.width / 2 - box.width / 2, 16, width - box.width - 16);
      setGeometry({ x, y, width: highlightWidth, height: highlightHeight, top, left, above, arrow: clamp(rect.left + rect.width / 2 - left, 20, box.width - 20) });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const target = targetFor(step.id);
    target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const observer = new ResizeObserver(schedule);
    if (target) observer.observe(target);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule); };
  }, [step]);
  return <DialogPrimitive.Root open onOpenChange={open => { if (!open) onFinish(); }}>
    <DialogPrimitive.Portal>
      <div className="fixed inset-0 z-[110] pointer-events-auto" aria-hidden="true" onWheel={event => event.preventDefault()} onTouchMove={event => event.preventDefault()} />
      {geometry && <div aria-hidden="true" data-tour-highlight={step?.id} className="pointer-events-none fixed z-[111] rounded-kws-control border-2 border-primary" style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height, boxShadow: '0 0 0 9999px hsl(var(--foreground) / 0.32)' }} />}
      {geometry && <span aria-hidden="true" className="pointer-events-none fixed z-[115] h-3 w-3 rotate-45 bg-card" style={{ left: geometry.left + geometry.arrow - 6, top: geometry.above ? geometry.top + (panel.current?.offsetHeight ?? 0) - 6 : geometry.top - 6 }} />}
      <DialogPrimitive.Content ref={panel} aria-label="Dein Training, kurz erklärt" aria-labelledby={undefined} onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus(); }} onCloseAutoFocus={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()} onInteractOutside={event => event.preventDefault()} data-training-coachmark={step?.id} data-swipe-ignore className="fixed z-[115] w-[min(320px,calc(100vw-32px))] rounded-kws-card bg-card p-4 text-foreground shadow-medium outline-none" style={{ top: geometry?.top ?? 16, left: geometry?.left ?? 16, visibility: geometry ? 'visible' : 'hidden', maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto' }}>
        <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Schritt {index + 1} von {steps.length}</p><Button type="button" size="icon" variant="ghost" className="-mr-2 -mt-2" aria-label="Einführung schließen" onClick={onFinish}><X aria-hidden="true" /></Button></div>
        <DialogPrimitive.Title ref={title} tabIndex={-1} className="mt-1 text-base font-semibold leading-snug outline-none">{step?.title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">{step?.text}</DialogPrimitive.Description>
        <div className="mt-4 flex items-center justify-between gap-2"><Button type="button" variant="ghost" className="px-1 text-xs" onClick={index ? () => setIndex(index - 1) : onFinish}>{index ? 'Zurück' : 'Überspringen'}</Button><Button type="button" className="px-3 text-sm" onClick={index < steps.length - 1 ? () => setIndex(index + 1) : onFinish}>{index < steps.length - 1 ? 'Weiter' : 'Los geht’s'}</Button></div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
