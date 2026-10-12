import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTraining } from '@/features/training/TrainingContext';
import { TRAINING_EQUIPMENT, WEEKDAYS } from '@/features/training/data';
import { cn } from '@/lib/utils';

const STEPS = ['Dein Ziel', 'Boulderstand', 'Stärken & Lernfelder', 'Kraftstand', 'Woche & Equipment', 'Einschränkungen'];
const UNKNOWN = 'Weiß ich nicht';
const MOVEMENTS = ['Fußtechnik', 'Körperposition', 'Hooks', 'Boulder lesen', 'Koordination', 'Überhang', 'Platte', 'Ausdauer', UNKNOWN];

function Choices({ label, options, values, onChange, multiple = false }: {
  label: string; options: readonly string[]; values: string[]; onChange: (value: string) => void; multiple?: boolean;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((value) => {
          const selected = values.includes(value);
          return <Button key={value} type="button" variant="secondary" aria-pressed={selected}
            disabled={multiple && values.length >= 2 && !selected && value !== UNKNOWN}
            onClick={() => onChange(value)} className={cn('h-auto min-h-11 justify-between whitespace-normal px-3 py-2 text-left text-xs sm:text-sm', value === UNKNOWN && 'col-span-2', selected && 'bg-primary text-primary-foreground hover:bg-primary/95')}>
            <span>{value}</span>{selected && <Check className="text-primary-foreground" aria-hidden="true" />}
          </Button>;
        })}
      </div>
      {multiple && <p className="text-xs text-muted-foreground">Bis zu zwei auswählen oder „{UNKNOWN}“.</p>}
    </fieldset>
  );
}

function Selection({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: readonly string[]; onChange: (value: string) => void;
}) {
  return <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-semibold">{label}</label>
    <Select value={value} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}

export default function TrainingPlanner() {
  const { answers, setAnswers, createPlan } = useTraining();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const selectFocus = (field: 'strengths' | 'weaknesses', value: string) => {
    setAnswers((previous) => {
      const existing = previous[field];
      const selected = existing.includes(value);
      const next = selected ? existing.filter((item) => item !== value)
        : value === UNKNOWN ? [UNKNOWN] : [...existing.filter((item) => item !== UNKNOWN), value].slice(-2);
      return { ...previous, [field]: next };
    });
  };
  const toggleDay = (day: number) => setAnswers((previous) => {
    const days = previous.days.includes(day) ? previous.days.filter((item) => item !== day) : [...previous.days, day].sort();
    return { ...previous, days, fixedDays: previous.fixedDays.filter((item) => days.includes(item)) };
  });
  const next = () => {
    const errors = [
      !answers.goal && 'Wähle ein Ziel für deine Beispielwoche.',
      (!answers.experience || !answers.grade) && 'Wähle deine Erfahrung und einen bekannten Hallengrad oder „Weiß ich nicht“.',
      (!answers.strengths.length || !answers.weaknesses.length) && 'Wähle je ein Lernfeld oder „Weiß ich nicht“.',
      (!answers.pullUps || !answers.pushUps || !answers.strengthExperience) && 'Wähle deine bekannte Erfahrung oder „Weiß ich nicht“.',
      (!answers.days.length || !answers.equipment.length || answers.minutes <= 0) && 'Wähle mindestens einen möglichen Tag und eine Equipmentoption.',
      !answers.constraints && 'Wähle eine Angabe oder „Möchte ich überspringen“.',
    ];
    if (errors[step]) { setError(errors[step] as string); return; }
    setError('');
    if (step === STEPS.length - 1) { createPlan(); navigate('/training/week'); }
    else setStep(step + 1);
  };

  return <div className="mx-auto max-w-2xl">
      <KwsSurface className="min-w-0 p-4 sm:p-6">
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 ref={heading} tabIndex={-1} className="text-base font-semibold outline-none">{STEPS[step]}</h2>
            <p className="text-xs text-muted-foreground" aria-live="polite">Schritt {step + 1} von {STEPS.length}</p>
          </div>
          <div className="grid grid-cols-6 gap-1" aria-hidden="true">
            {STEPS.map((title, index) => <span key={title} className={cn('h-1 rounded-kws-badge', index <= step ? 'bg-primary' : 'bg-secondary')} />)}
          </div>
        </div>

        <div className="space-y-5">
          {step === 0 && <>
            <Choices label="Was möchtest du üben?" options={['Bouldern allgemein', 'Technik verbessern', 'Kraft aufbauen', 'Wettkampf vorbereiten']}
              values={[answers.goal]} onChange={(goal) => setAnswers((previous) => ({ ...previous, goal }))} />
            {answers.goal.includes('Wettkampf') && <p className="text-xs text-muted-foreground">Dein bestehender Coachplan bleibt die Grundlage für Wettkampfbelastungen.</p>}
          </>}
          {step === 1 && <>
            <Selection id="training-experience" label="Wie lange boulderst du?" value={answers.experience}
              options={['Ich fange gerade an', 'Unter 6 Monate', '6–12 Monate', '1–3 Jahre', 'Über 3 Jahre']}
              onChange={(experience) => setAnswers((previous) => ({ ...previous, experience }))} />
            <Selection id="training-grade" label="Welchen KWS-Hallengrad schaffst du häufiger?" value={answers.grade}
              options={['Weiß ich nicht', '1', '2', '3', '4', '5', '6', '7', '8']}
              onChange={(grade) => setAnswers((previous) => ({ ...previous, grade }))} />
            <p className="text-xs text-muted-foreground">Hallengrad als Orientierung, keine Lastvorgabe.</p>
          </>}
          {step === 2 && <>
            <Choices label="Was fühlt sich schon vertraut an?" options={MOVEMENTS} values={answers.strengths} multiple onChange={(value) => selectFocus('strengths', value)} />
            <Choices label="Was möchtest du besser kennenlernen?" options={MOVEMENTS} values={answers.weaknesses} multiple onChange={(value) => selectFocus('weaknesses', value)} />
          </>}
          {step === 3 && <>
            <p className="text-xs text-muted-foreground">Nur bekannte Werte angeben. „Weiß ich nicht“ ist ausreichend; kein Test nötig.</p>
            <Selection id="training-strength-experience" label="Deine Erfahrung mit Kraftübungen" value={answers.strengthExperience}
              options={['Wenig Erfahrung', 'Gelegentlich', 'Regelmäßig', 'Weiß ich nicht']}
              onChange={(strengthExperience) => setAnswers((previous) => ({ ...previous, strengthExperience }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Selection id="training-pullups" label="Bekannte Klimmzug-Erfahrung" value={answers.pullUps}
                options={['Weiß ich nicht', '0', 'Mit Unterstützung', '1–3', '4–8', 'Mehr als 8']}
                onChange={(pullUps) => setAnswers((previous) => ({ ...previous, pullUps }))} />
              <Selection id="training-pushups" label="Bekannte Liegestütz-Erfahrung" value={answers.pushUps}
                options={['Weiß ich nicht', '0', 'Erhöhte Variante', '1–5', '6–10', 'Mehr als 10']}
                onChange={(pushUps) => setAnswers((previous) => ({ ...previous, pushUps }))} />
            </div>
          </>}
          {step === 4 && <>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Welche Tage kommen infrage?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {WEEKDAYS.map((day, index) => <Button key={day} type="button" variant="secondary" aria-pressed={answers.days.includes(index)}
                  onClick={() => toggleDay(index)} className={cn('gap-1 px-2 text-xs', answers.days.includes(index) && 'bg-primary/15 hover:bg-primary/20')}>
                  {day}{answers.days.includes(index) && <Check className="h-4 w-4 text-primary-ink" aria-hidden="true" />}
                </Button>)}
              </div>
              <p className="text-xs text-muted-foreground">{answers.days.length} mögliche {answers.days.length === 1 ? 'Termin' : 'Termine'}</p>
            </fieldset>
            {answers.days.length > 0 && <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Welche davon sind fest? <span className="font-normal text-muted-foreground">Optional</span></legend>
              <div className="flex flex-wrap gap-2">{answers.days.map((day) => <Button key={day} type="button" variant="secondary" aria-pressed={answers.fixedDays.includes(day)}
                onClick={() => setAnswers((previous) => ({ ...previous, fixedDays: previous.fixedDays.includes(day) ? previous.fixedDays.filter((item) => item !== day) : [...previous.fixedDays, day] }))}
                className={cn(answers.fixedDays.includes(day) && 'bg-primary/15 hover:bg-primary/20')}>
                {WEEKDAYS[day]}{answers.fixedDays.includes(day) && <Check className="text-primary-ink" aria-hidden="true" />}
              </Button>)}</div>
            </fieldset>}
            <Selection id="training-minutes" label="Minuten pro Termin, inklusive Pausen" value={String(answers.minutes)} options={['30', '45', '60', '75', '90']}
              onChange={(minutes) => setAnswers((previous) => ({ ...previous, minutes: Number(minutes) }))} />
            <Choices label="Welches Equipment steht dir zur Verfügung?" options={TRAINING_EQUIPMENT} values={answers.equipment}
              onChange={(value) => setAnswers((previous) => {
                const equipment = value as typeof previous.equipment[number];
                return { ...previous, equipment: previous.equipment.includes(equipment) ? previous.equipment.filter((item) => item !== equipment)
                  : equipment === 'Ohne Gerät' ? ['Ohne Gerät'] : [...previous.equipment.filter((item) => item !== 'Ohne Gerät'), equipment] };
              })} />
          </>}
          {step === 5 && <>
            <Choices label="Was sollen wir bei der Vorschau berücksichtigen?" options={['Keine', 'Wiedereinstieg nach Pause', 'Belastung aktuell eingeschränkt', 'Möchte ich überspringen']}
              values={[answers.constraints]} onChange={(constraints) => setAnswers((previous) => ({ ...previous, constraints }))} />
            <p className="text-xs text-muted-foreground">Keine Diagnose nötig. Bei Beschwerden ersetzt die Vorschau keine fachliche Abklärung.</p>
            <section className="space-y-3 border-t border-border pt-4" aria-label="Zusammenfassung deiner Angaben">
              <h3 className="text-sm font-semibold">Deine Angaben</h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Ziel</dt><dd>{answers.goal}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Zeitbudget</dt><dd>{answers.minutes} Min. je Termin</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Tage</dt><dd>{answers.days.map((day) => `${WEEKDAYS[day]}${answers.fixedDays.includes(day) ? ' (fest)' : ''}`).join(' · ') || 'Noch keine'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Equipment</dt><dd>{answers.equipment.join(' · ') || 'Noch nicht gewählt'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Lernfelder</dt><dd>{answers.weaknesses.join(' · ') || UNKNOWN}</dd></div>
              </dl>
            </section>
          </>}
        </div>

        {error && <p id="training-step-error" role="alert" className="mt-5 rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" className="text-xs sm:text-sm" disabled={step === 0} onClick={() => { setError(''); setStep(step - 1); }}><ArrowLeft aria-hidden="true" />Zurück</Button>
          <Button type="button" onClick={next} aria-describedby={error ? 'training-step-error' : undefined} className="ml-auto text-xs sm:text-sm">
            {step === STEPS.length - 1 ? 'Vorschau ansehen' : 'Weiter'}<ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </KwsSurface>
  </div>;
}
