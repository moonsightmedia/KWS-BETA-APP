import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { useTraining } from '@/features/training/TrainingContext';
import { TRAINING_EQUIPMENT, WEEKDAYS } from '@/features/training/data';
import type { TrainingAnswers } from '@/features/training/types';
import { cn } from '@/lib/utils';

const UNKNOWN = 'Weiß ich nicht';
const PHASES = ['Ziel', 'Boulderstand', 'Lernfelder', 'Kraftstand', 'Deine Woche', 'Prüfen'];
const MOVEMENTS = ['Fußtechnik', 'Körperposition', 'Hooks', 'Boulder lesen', 'Koordination', 'Überhang', 'Platte', 'Ausdauer', UNKNOWN];
type AnswersWithAge = TrainingAnswers & { ageGroup?: 'adult' | 'minor' | 'unknown' };
type QuestionKey = keyof AnswersWithAge;
const QUESTIONS: { key: QuestionKey; phase: number; title: string; prompt: string; hint?: string; options?: readonly string[] }[] = [
  { key: 'goal', phase: 0, title: 'Ziel', prompt: 'Was möchtest du mit deinem Training erreichen?', options: ['Bouldern allgemein', 'Technik verbessern', 'Kraft aufbauen', 'Wettkampf vorbereiten'] },
  { key: 'ageGroup', phase: 1, title: 'Altersgruppe', prompt: 'Zu welcher Altersgruppe gehörst du?', hint: 'Für Jugendliche braucht es einen eigenen Planungspfad; kein Geburtsdatum nötig.' },
  { key: 'experience', phase: 1, title: 'Boulder-Erfahrung', prompt: 'Wie lange boulderst du schon?', options: ['Ich fange gerade an', 'Unter 6 Monate', '6–12 Monate', '1–3 Jahre', 'Über 3 Jahre'] },
  { key: 'grade', phase: 1, title: 'Hallengrad', prompt: 'Welchen KWS-Hallengrad schaffst du häufiger?', hint: 'Als Orientierung. Ein Grad allein sagt nichts über passende Trainingslasten.' },
  { key: 'strengths', phase: 2, title: 'Stärken', prompt: 'Was fühlt sich an der Wand schon vertraut an?', hint: 'Bis zu zwei auswählen oder „Weiß ich nicht“.', options: MOVEMENTS },
  { key: 'weaknesses', phase: 2, title: 'Lernfelder', prompt: 'Was möchtest du als Nächstes besser kennenlernen?', hint: 'Bis zu zwei auswählen oder „Weiß ich nicht“.', options: MOVEMENTS },
  { key: 'strengthExperience', phase: 3, title: 'Kraftpraxis', prompt: 'Wie vertraut bist du mit Kraftübungen?', options: ['Wenig Erfahrung', 'Gelegentlich', 'Regelmäßig', UNKNOWN] },
  { key: 'pullUps', phase: 3, title: 'Klimmzüge', prompt: 'Welche Klimmzug-Erfahrung kennst du von dir?', hint: 'Kein Test nötig. Gib nur an, was du bereits weißt.', options: [UNKNOWN, '0', 'Mit Unterstützung', '1–3', '4–8', 'Mehr als 8'] },
  { key: 'pushUps', phase: 3, title: 'Liegestütze', prompt: 'Und wie sieht es mit Liegestützen aus?', hint: 'Auch hier ist „Weiß ich nicht“ ausreichend.', options: [UNKNOWN, '0', 'Erhöhte Variante', '1–5', '6–10', 'Mehr als 10'] },
  { key: 'days', phase: 4, title: 'Mögliche Tage', prompt: 'An welchen Tagen möchtest du Zeit einplanen?', hint: 'Wähle mögliche Termine. Du kannst später verschieben oder auslassen.' },
  { key: 'fixedDays', phase: 4, title: 'Feste Termine', prompt: 'Sind davon schon Termine fest verplant?', hint: 'Diese Tage bleiben für dein bestehendes Training reserviert. Keine Auswahl ist auch möglich.' },
  { key: 'minutes', phase: 4, title: 'Zeitbudget', prompt: 'Wie viel Zeit hast du pro Termin?', hint: 'Inklusive Vorbereitung und Pausen.' },
  { key: 'equipment', phase: 4, title: 'Equipment', prompt: 'Was steht dir zum Trainieren zur Verfügung?', options: TRAINING_EQUIPMENT },
  { key: 'constraints', phase: 5, title: 'Einschränkungen', prompt: 'Gibt es etwas, das vor einer Planung geklärt werden muss?', hint: 'Keine Diagnose angeben. Beschwerden werden fachlich geklärt, nicht vom Assistenten behandelt.', options: ['Keine', 'Wiedereinstieg nach Pause', 'Belastung aktuell eingeschränkt', 'Möchte ich überspringen'] },
];
const ageLabel = (value?: string) => value === 'adult' ? '18 oder älter' : value === 'minor' ? '16–17 Jahre' : 'Keine Angabe';
function answerLabel(answers: AnswersWithAge, key: QuestionKey) {
  if (key === 'ageGroup') return ageLabel(answers.ageGroup);
  if (key === 'days' || key === 'fixedDays') return answers[key].map(day => WEEKDAYS[day]).join(' · ') || (key === 'fixedDays' ? 'Keine festen Termine' : 'Noch nicht gewählt');
  if (key === 'minutes') return `${answers.minutes} Minuten`;
  const value = answers[key];
  return Array.isArray(value) ? value.join(' · ') || 'Noch nicht gewählt' : String(value || UNKNOWN);
}
function validate(answers: AnswersWithAge, key: QuestionKey) {
  if (key === 'fixedDays') return '';
  if (key === 'ageGroup') return answers.ageGroup ? '' : 'Wähle eine Altersgruppe oder „Keine Angabe“.';
  const value = answers[key];
  return Array.isArray(value) ? value.length ? '' : key === 'days' ? 'Wähle mindestens einen möglichen Tag.' : 'Wähle eine Antwort oder „Weiß ich nicht“, sofern angeboten.'
    : value ? '' : 'Wähle eine Antwort, um weiterzugehen.';
}

export function TrainingConversation({ onComplete, contained = false }: { onComplete?: () => void; contained?: boolean }) {
  const { answers: storedAnswers, setAnswers, createPlan } = useTraining();
  const answers = storedAnswers as AnswersWithAge;
  const navigate = useNavigate();
  const [turn, setTurn] = useState(0);
  const [confirmed, setConfirmed] = useState<number[]>([]);
  const [editingReview, setEditingReview] = useState(false);
  const [coachAnswer, setCoachAnswer] = useState<'yes' | 'no' | 'unknown'>(storedAnswers.coachGuided ? 'yes' : 'unknown');
  const [error, setError] = useState('');
  const promptRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const review = turn === QUESTIONS.length;
  const question = QUESTIONS[turn];
  const describeAnswer = (key: QuestionKey) => `${answerLabel(answers, key)}${key === 'weaknesses' && answers.weaknesses.includes('Hooks') ? ` · Anleitung: ${coachAnswer === 'yes' ? 'Ja, vor Ort' : coachAnswer === 'no' ? 'Nein' : 'Noch offen'}` : ''}`;
  const phase = review ? 5 : question.phase;
  useEffect(() => {
    promptRef.current?.focus({ preventScroll: true });
    if (contained) scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    else window.scrollTo({ top: 0, behavior: 'auto' });
  }, [turn, contained]);

  const pick = (key: QuestionKey, value: string) => {
    setError('');
    setAnswers(previous => {
      if (key === 'strengths' || key === 'weaknesses') {
        const current = previous[key];
        const values = current.includes(value) ? current.filter(item => item !== value)
          : value === UNKNOWN ? [UNKNOWN] : [...current.filter(item => item !== UNKNOWN), value].slice(-2);
        return { ...previous, [key]: values };
      }
      if (key === 'equipment') {
        const equipment = value as TrainingAnswers['equipment'][number];
        return { ...previous, equipment: previous.equipment.includes(equipment) ? previous.equipment.filter(item => item !== equipment)
          : equipment === 'Ohne Gerät' ? ['Ohne Gerät'] : [...previous.equipment.filter(item => item !== 'Ohne Gerät'), equipment] };
      }
      return { ...previous, [key]: key === 'minutes' ? Number(value) : value };
    });
  };
  const toggleDay = (day: number, fixed: boolean) => {
    setError('');
    setAnswers(previous => {
      const key = fixed ? 'fixedDays' : 'days';
      const next = previous[key].includes(day) ? previous[key].filter(item => item !== day) : [...previous[key], day].sort((a, b) => a - b);
      return fixed ? { ...previous, fixedDays: next.filter(item => previous.days.includes(item)) }
        : { ...previous, days: next, fixedDays: previous.fixedDays.filter(item => next.includes(item)) };
    });
  };
  const edit = (index: number) => { setError(''); setEditingReview(review); setTurn(index); };
  const next = () => {
    if (review) {
      const invalid = QUESTIONS.findIndex(item => validate(answers, item.key));
      if (invalid >= 0) { setTurn(invalid); setEditingReview(true); setError(validate(answers, QUESTIONS[invalid].key)); return; }
      // The week route presents either a draft or an explicit needs-review result.
      createPlan(); onComplete?.(); navigate('/training/week'); return;
    }
    const message = validate(answers, question.key);
    if (message) { setError(message); return; }
    setError(''); setConfirmed(previous => previous.includes(turn) ? previous : [...previous, turn]);
    setTurn(editingReview ? QUESTIONS.length : turn + 1); setEditingReview(false);
  };

  const choices = (options: readonly string[], key: QuestionKey, customLabels?: Record<string, string>) => {
    const current = answers[key];
    const multiple = key === 'strengths' || key === 'weaknesses';
    return <div className="grid grid-cols-2 gap-2" role="group" aria-label={question.prompt}>
      {options.map(value => {
        const selected = Array.isArray(current) ? current.includes(value as never) : String(current) === value;
        return <Button key={value} type="button" variant="secondary" aria-pressed={selected}
          disabled={multiple && Array.isArray(current) && current.length >= 2 && !selected && value !== UNKNOWN}
          onClick={() => pick(key, value)}
          className={cn('h-auto min-h-11 justify-start whitespace-normal px-3 py-3 text-left text-xs sm:text-sm', value === UNKNOWN && 'col-span-2', selected && 'bg-primary text-primary-foreground hover:bg-primary/95')}>
          <span className="flex-1">{customLabels?.[value] ?? value}</span>{selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
        </Button>;
      })}
    </div>;
  };

  return <div className={cn('flex min-h-0 flex-col', contained ? 'flex-1' : 'min-h-[65dvh]')}>
    <div className={cn('flex shrink-0 items-center justify-between gap-3', contained ? 'px-4 pb-3 pt-2' : 'pb-4')}>
      <p className="text-xs font-semibold">{PHASES[phase]}</p><p className="text-xs text-muted-foreground" aria-live="polite">Schritt {phase + 1} von 6</p>
    </div>
    <div className={cn('grid shrink-0 grid-cols-6 gap-1', contained ? 'px-4' : '')} aria-hidden="true">
      {PHASES.map((label, index) => <span key={label} className={cn('h-1 rounded-kws-badge', index <= phase ? 'bg-primary' : 'bg-secondary')} />)}
    </div>
    <div ref={scrollRef} className={cn('space-y-4', contained ? 'min-h-0 flex-1 overflow-y-auto px-4 py-4' : 'flex-1 py-5')}>
      {!review && confirmed.filter(index => index < turn).slice(-2).map(index => <div key={index} className="ml-8 flex justify-end">
        <button type="button" onClick={() => edit(index)} className="max-w-full rounded-kws-control bg-primary/10 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${QUESTIONS[index].title} bearbeiten: ${describeAnswer(QUESTIONS[index].key)}`}>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">Du · {QUESTIONS[index].title}<Pencil className="h-3 w-3" aria-hidden="true" /></span>
          <span className="mt-1 block text-sm">{describeAnswer(QUESTIONS[index].key)}</span>
        </button>
      </div>)}
      <div className="flex items-start gap-3">
        <KwsSurface className="min-w-0 flex-1 space-y-2 p-4">
          <h2 ref={promptRef} tabIndex={-1} className="text-sm font-semibold leading-relaxed outline-none">{review ? 'Passt das so? Prüfe deine Angaben, bevor du die Beispielwoche erstellst.' : question.prompt}</h2>
          {!review && question.hint && <p className="text-xs leading-relaxed text-muted-foreground">{question.hint}</p>}
        </KwsSurface>
      </div>
      {review ? <KwsSurface className="divide-y divide-border px-4" role="region" aria-label="Angaben prüfen">
        {QUESTIONS.map((item, index) => <button key={item.key} type="button" onClick={() => edit(index)} className="flex min-h-14 w-full items-center gap-3 rounded-kws-control py-3 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{item.title}</span><span className="mt-1 block text-sm">{describeAnswer(item.key)}</span></span><Pencil className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>)}
      </KwsSurface> : <div className="space-y-3" key={question.key}>
        {question.options && choices(question.options, question.key)}
        {question.key === 'weaknesses' && answers.weaknesses.includes('Hooks') && <fieldset className="space-y-2 border-t border-border pt-3">
          <legend className="pt-3 text-xs font-medium">Übst du Hooks mit qualifizierter Anleitung vor Ort?</legend>
          <div className="grid grid-cols-3 gap-2">{([{ value: 'yes', label: 'Ja' }, { value: 'no', label: 'Nein' }, { value: 'unknown', label: 'Noch offen' }] as const).map(option => <Button key={option.value} type="button" variant="secondary" aria-pressed={coachAnswer === option.value} onClick={() => { setCoachAnswer(option.value); setAnswers(previous => ({ ...previous, coachGuided: option.value === 'yes' })); }} className={cn('px-2 text-xs', coachAnswer === option.value && 'bg-primary text-primary-foreground hover:bg-primary/95')}>{option.label}</Button>)}</div>
        </fieldset>}
        {question.key === 'ageGroup' && choices(['adult', 'minor', 'unknown'], 'ageGroup', { adult: '18 oder älter', minor: '16–17 Jahre', unknown: 'Keine Angabe' })}
        {question.key === 'grade' && <>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="KWS-Hallengrad">{['1', '2', '3', '4', '5', '6', '7', '8'].map(value => <Button key={value} variant="secondary" type="button" aria-pressed={answers.grade === value} aria-label={`Hallengrad ${value}`} onClick={() => pick('grade', value)} className={cn('h-12 text-base', answers.grade === value && 'bg-primary text-primary-foreground hover:bg-primary/95')}>{value}</Button>)}</div>
          <Button type="button" variant="secondary" aria-pressed={answers.grade === UNKNOWN} onClick={() => pick('grade', UNKNOWN)} className={cn('w-full', answers.grade === UNKNOWN && 'bg-primary text-primary-foreground hover:bg-primary/95')}>{UNKNOWN}{answers.grade === UNKNOWN && <Check aria-hidden="true" />}</Button>
        </>}
        {(question.key === 'days' || question.key === 'fixedDays') && <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={question.prompt}>
            {WEEKDAYS.map((day, index) => question.key === 'fixedDays' && !answers.days.includes(index) ? null : <Button key={day} type="button" variant="secondary" aria-pressed={answers[question.key as 'days' | 'fixedDays'].includes(index)} onClick={() => toggleDay(index, question.key === 'fixedDays')}
              className={cn('px-2 text-xs', answers[question.key as 'days' | 'fixedDays'].includes(index) && 'bg-primary text-primary-foreground hover:bg-primary/95')}><CalendarDays className="h-4 w-4" aria-hidden="true" />{day}{answers[question.key as 'days' | 'fixedDays'].includes(index) && <Check className="h-4 w-4" aria-hidden="true" />}</Button>)}
          </div>
          <p className="text-xs text-muted-foreground">{question.key === 'days' ? `${answers.days.length} mögliche Termine` : `${answers.fixedDays.length} feste Termine · ${answers.days.length} Termine insgesamt`}</p>
        </>}
        {question.key === 'minutes' && <div className="grid grid-cols-3 gap-2" role="group" aria-label="Minuten pro Termin">{[30, 45, 60, 75, 90].map(value => <Button key={value} type="button" variant="secondary" aria-pressed={answers.minutes === value} onClick={() => pick('minutes', String(value))} className={cn('px-2 text-xs', answers.minutes === value && 'bg-primary text-primary-foreground hover:bg-primary/95')}><Clock3 className="h-4 w-4" aria-hidden="true" />{value} Min.</Button>)}</div>}
        {question.key === 'goal' && answers.goal === 'Wettkampf vorbereiten' && <p className="text-xs text-muted-foreground">Stimme die Vorschau mit deinem bestehenden Coachplan ab.</p>}
      </div>}
      {review && <p className="text-xs leading-relaxed text-muted-foreground">Geführte Planung mit festen Regeln, keine KI-Auswertung. Einschränkungen und offene Voraussetzungen führen zur Prüfung statt zu einer automatischen Trainingsfreigabe.</p>}
      {error && <p id="training-conversation-error" role="alert" className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </div>
    <div className={cn('flex shrink-0 gap-3 border-t border-border bg-card p-4', contained ? 'pb-[max(1rem,env(safe-area-inset-bottom))]' : 'sticky bottom-[var(--mobile-nav-floating-offset)] rounded-kws-card shadow-soft md:bottom-4')}>
      <Button type="button" variant="secondary" disabled={turn === 0} onClick={() => { setError(''); setEditingReview(false); setTurn(Math.max(0, turn - 1)); }} className="text-xs sm:text-sm"><ArrowLeft aria-hidden="true" />Zurück</Button>
      <Button type="button" onClick={next} className="ml-auto text-xs sm:text-sm" aria-describedby={error ? 'training-conversation-error' : undefined}>{review ? 'Beispielwoche erstellen' : editingReview ? 'Übernehmen' : 'Weiter'}<ArrowRight aria-hidden="true" /></Button>
    </div>
  </div>;
}

export default function TrainingPlanner() {
  return <div className="mx-auto max-w-xl"><TrainingConversation /></div>;
}
