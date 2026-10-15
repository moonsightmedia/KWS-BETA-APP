import type { TrainingCompletion, TrainingSession, TrainingWeekPlan } from './types';

export const MAX_TRAINING_HISTORY = 30;
export const cloneTrainingSession = (session: TrainingSession): TrainingSession => ({ ...session, exercises: session.exercises.map(item => ({ ...item })) });
export const completionOrigin = (plan: TrainingWeekPlan, entryId: string) => `${plan.id ?? 'legacy'}:${entryId}`;

export function recordTrainingCompletion(history: TrainingCompletion[], session: TrainingSession, originKey?: string, now = new Date()): TrainingCompletion[] {
  if (!session.exercises.length || (originKey && history.some(item => item.originKey === originKey))) return history;
  // Prevent a double tap from recording the same independent session twice.
  if (!originKey && history.some(item => item.session.id === session.id && now.getTime() - Date.parse(item.completedAt) < 10000)) return history;
  return [{ id: crypto.randomUUID(), completedAt: now.toISOString(), session: cloneTrainingSession(session), ...(originKey ? { originKey } : {}) }, ...history].slice(0, MAX_TRAINING_HISTORY);
}

export function repeatTrainingCompletion(completion: TrainingCompletion): TrainingSession {
  const session = cloneTrainingSession(completion.session);
  delete session.budgetMinutes;
  return { ...session, id: crypto.randomUUID(), title: `${session.title.slice(0, 60)} · Wiederholung`, focus: 'Selbst zusammengestellt', exercises: session.exercises.map(item => ({ ...item, id: crypto.randomUUID(), reason: 'Aus deiner abgeschlossenen Einheit übernommen. Prüfe den Umfang für heute.' })), rationale: 'Wiederholung einer abgeschlossenen Einheit. Passe Übungen und Umfang an, bevor du erneut trainierst.' };
}
