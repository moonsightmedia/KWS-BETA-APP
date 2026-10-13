import { EMPTY_SESSION, getExercise } from './data';
import { MAX_TRAINING_HISTORY } from './trainingHistory';
import type { TrainingCompletion, TrainingSession, TrainingWeekPlan } from './types';

export interface SavedTraining {
  favorites: string[];
  draft: TrainingSession;
  sessions: TrainingSession[];
  plan: TrainingWeekPlan | null;
  history: TrainingCompletion[];
}
export const emptyTraining = (): SavedTraining => ({ favorites: [], draft: { ...EMPTY_SESSION, exercises: [] }, sessions: [], plan: null, history: [] });
export const trainingStorageKey = (accountId: string) => `kws-training-v2:${accountId}`;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const finiteRange = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const text = (value: unknown, max = 1000): value is string => typeof value === 'string' && value.length <= max;
function validSession(value: unknown): value is TrainingSession {
  if (!object(value) || !text(value.id, 100) || !text(value.title, 200) || !text(value.focus, 200) || !(value.minutes === null || finiteRange(value.minutes, 0, 1440)) || !Array.isArray(value.exercises) || value.exercises.length > 50) return false;
  if (value.rationale !== undefined && !text(value.rationale)) return false;
  for (const key of ['preparationMinutes', 'cooldownMinutes', 'budgetMinutes']) if (value[key] !== undefined && !finiteRange(value[key], 0, 1440)) return false;
  return value.exercises.every(item => object(item) && text(item.id, 100) && text(item.exerciseId, 100) && getExercise(item.exerciseId)?.area !== 'rehab' && Boolean(getExercise(item.exerciseId)?.defaultDose) && finiteRange(item.sets, 1, 20) && Number.isInteger(item.sets) && text(item.repetitions, 100) && finiteRange(item.restSeconds, 0, 600) && (item.reason === undefined || text(item.reason)) && (item.restScope === undefined || item.restScope === 'sets' || item.restScope === 'repetitions'));
}
/** Intake answers are deliberately excluded; stored plans contain no complaint text. */
export function readTraining(accountId: string): SavedTraining {
  try {
    const raw = localStorage.getItem(trainingStorageKey(accountId));
    if (!raw || raw.length > 2000000) return emptyTraining();
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 2 || !Array.isArray(value.favorites) || value.favorites.length > 100 || !value.favorites.every(id => text(id, 100) && getExercise(id)) || !validSession(value.draft) || !Array.isArray(value.sessions) || value.sessions.length > 100 || !value.sessions.every(validSession)) return emptyTraining();
    const sessions = value.sessions;
    if (new Set(sessions.map(session => session.id)).size !== sessions.length) return emptyTraining();
    const plan = value.plan;
    if (plan !== null) {
      if (!object(plan) || (plan.id !== undefined && !text(plan.id, 100)) || !text(plan.summary) || !Array.isArray(plan.entries) || plan.entries.length > 7 || !['draft', 'needs-review', undefined].includes(plan.status as undefined | string) || (plan.notes !== undefined && (!Array.isArray(plan.notes) || !plan.notes.every(note => text(note))))) return emptyTraining();
      if (!plan.entries.every(entry => object(entry) && text(entry.id, 100) && finiteRange(entry.day, 0, 6) && Number.isInteger(entry.day) && typeof entry.fixed === 'boolean' && typeof entry.completed === 'boolean' && sessions.some(session => session.id === entry.sessionId))) return emptyTraining();
      if (new Set(plan.entries.map(entry => (entry as { day: number }).day)).size !== plan.entries.length) return emptyTraining();
    }
    // Older v2 plans remain usable; completion history was not recorded then.
    const history: TrainingCompletion[] = Array.isArray(value.history) ? value.history.slice(0, MAX_TRAINING_HISTORY).filter((item): item is TrainingCompletion => object(item) && text(item.id, 100) && text(item.completedAt, 40) && Number.isFinite(Date.parse(item.completedAt)) && validSession(item.session) && item.session.exercises.length > 0 && (item.originKey === undefined || text(item.originKey, 220))) : [];
    const uniqueHistory = history.filter((item, index) => history.findIndex(other => other.id === item.id) === index).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
    return { favorites: value.favorites as string[], draft: value.draft, sessions, plan: plan as TrainingWeekPlan | null, history: uniqueHistory };
  } catch { return emptyTraining(); }
}
export function writeTraining(accountId: string, state: SavedTraining): boolean {
  try {
    const raw = JSON.stringify({ version: 2, ...state });
    // Keep the last readable state if the local collection reaches its limits.
    if (raw.length > 2000000 || state.sessions.length > 100) return false;
    localStorage.setItem(trainingStorageKey(accountId), raw);
    return true;
  } catch { return false; }
}
