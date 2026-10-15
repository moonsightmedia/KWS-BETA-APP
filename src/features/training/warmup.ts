import type { TrainingExercise, TrainingSession } from './types';

export interface WarmupStep { id: string; title: string; minutes: number; instruction: string }
export interface SessionWarmup { minutes: number; steps: WarmupStep[] }

export const WARMUP_SOURCES = [
  { label: 'DAV: Aufwärmen und Einklettern', url: 'https://www.alpenverein.de/artikel/besser-klettern-verletzungen-vorbeugen_abb076b0-bc4c-4570-966f-b3d7368fd036', context: 'Praxisquelle für allgemeine Bewegung und anschließendes Einklettern. Das ausführliche DAV-Programm ist länger; die kurze App-Abfolge ist keine Kopie davon und kein nachgewiesenes Präventionsprogramm.' },
  { label: 'McCrary et al. (2015): Upper-body warm-up', url: 'https://pubmed.ncbi.nlm.nih.gov/25694615/', context: 'Systematische Übersicht zu Leistungswirkungen. Sie validiert weder unsere Wiederholungszahlen noch das Aufwärmprogramm für Bouldern; sie fand keine Studien zur Verletzungsprävention des Oberkörper-Aufwärmens.' },
];

function strengthInstruction(exercise: TrainingExercise): string {
  if (exercise.id === 'incline-pushup') return 'Hände auf die feste Bank, Füße näher zur Bank. 5 ruhige Liegestütze mit geradem Körper. 45 Sek. Pause; nochmals 5, wenn es leicht bleibt.';
  if (exercise.id === 'pushup') return '5 Liegestütze mit den Knien am Boden. Kopf, Hüfte und Knie bleiben in einer Linie. 45 Sek. Pause, dann nochmals 5, wenn es leicht bleibt.';
  if (['bodyweight-squat', 'split-squat', 'kettlebell-goblet-squat'].includes(exercise.id)) return '8 Kniebeugen ohne Gewicht: Füße hüftbreit, Gesäß nach hinten senken und wieder aufrichten. 45 Sek. Pause; nochmals 8, wenn es leicht bleibt.';
  if (exercise.id === 'kettlebell-deadlift') return '8 Hüftbeugen ohne Gewicht: Knie leicht beugen, Gesäß nach hinten schieben, Rücken gerade halten und wieder aufrichten. Danach 5 Wiederholungen mit einer leichten Kettlebell.';
  if (exercise.id === 'pullup') return 'Nur bei vertrauter, leichter Ausführung: 1 Klimmzug ohne Schwung, 60 Sek. Pause, dann 1 weiterer. Wenn ein einzelner Klimmzug schwer ist, vorher eine unterstützte Variante zeigen lassen.';
  if (exercise.defaultDose?.repetitionUnit === 'Haltephasen') return `2 kurze Haltephasen von je 5 Sek., dazwischen 45 Sek. Pause${exercise.defaultDose.sideMultiplier === 2 ? '; je Seite' : ''}. Einfache Variante: ${exercise.easier}`;
  const side = exercise.defaultDose?.sideMultiplier === 2 ? ' je Seite' : '';
  const loaded = (exercise.requiredEquipment ?? [exercise.equipment]).some(equipment => ['Kettlebell', 'Kurzhanteln', 'EZ-Stange', 'Widerstandsband'].includes(equipment));
  return `5 ruhige Wiederholungen${side}, 45 Sek. Pause, dann nochmals 5, wenn es leicht bleibt. ${loaded ? 'Mit deutlich leichterer Last bzw. geringerer Bandspannung als im Training beginnen.' : `Einfache Variante: ${exercise.easier}`}`;
}

/** Editorial preparation example, not a readiness test or prevention guarantee. */
export function createSessionWarmup(session: TrainingSession, exercises: TrainingExercise[]): SessionWarmup | null {
  exercises = exercises.filter(exercise => Boolean(exercise.defaultDose) && exercise.contentKind !== 'orientation' && ['strength', 'boulder', 'mobility'].includes(exercise.area));
  const budget = session.preparationMinutes ?? 0;
  if (!Number.isFinite(budget) || budget <= 0 || !exercises.length) return null;
  const boulder = exercises.some(exercise => exercise.area === 'boulder');
  const strength = exercises.find(exercise => exercise.area === 'strength');
  const minutes = !boulder && !strength ? Math.min(budget, 5) : budget;
  const general = Math.min(2, minutes >= 4 ? Math.floor(minutes / 4) : minutes / 4);
  const movement = general;
  const specific = minutes - general - movement;
  const steps: WarmupStep[] = [
    { id: 'walk', title: 'Zügig gehen', minutes: general, instruction: 'Zügig gehen oder auf der Stelle marschieren. Arme mitschwingen; wähle ein Tempo, bei dem du sprechen kannst.' },
    { id: 'move', title: 'Schultern, Hände und Beine bewegen', minutes: movement, instruction: 'Schultern 10-mal je Richtung kreisen. Hände 10-mal öffnen und schließen. Handgelenke 10-mal je Richtung kreisen. 8 langsame Kniebeugen ohne Gewicht.' },
  ];
  if (boulder) steps.push({ id: 'easy-boulders', title: 'Leichte Boulder klettern', minutes: strength ? specific / 2 : specific, instruction: '2–3 kurze, sehr leichte Boulder mit großen Griffen. Ruhig klettern und abklettern; dazwischen etwa 30 Sek. Pause. Nur steigern, wenn es leicht bleibt.' });
  if (strength) steps.push({ id: 'strength-start', title: `${strength.title} vorbereiten`, minutes: boulder ? specific / 2 : specific, instruction: strengthInstruction(strength) });
  if (!boulder && !strength) steps.push({ id: 'mobility-start', title: 'Locker weiterbewegen', minutes: specific, instruction: 'Abwechselnd ein Knie anheben, den Fuß absetzen und zur anderen Seite wechseln: 8-mal je Seite. Danach die Schultern nochmals je 10-mal nach vorn und hinten kreisen.' });
  return { minutes, steps };
}
