import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { DEFAULT_ANSWERS, EMPTY_SESSION, getExercise, getSessionMinutes, makeSessionItem, TRAINING_EXERCISES } from './data';
import type { TrainingAnswers, TrainingSession, TrainingWeekPlan } from './types';

interface TrainingState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  draft: TrainingSession;
  updateDraft: Dispatch<SetStateAction<TrainingSession>>;
  addToDraft: (exerciseId: string) => void;
  saveDraft: () => string | null;
  sessions: TrainingSession[];
  updateSession: (id: string, update: Partial<TrainingSession>) => void;
  replaceExercise: (sessionId: string, itemId: string, exerciseId: string) => void;
  answers: TrainingAnswers;
  setAnswers: Dispatch<SetStateAction<TrainingAnswers>>;
  plan: TrainingWeekPlan | null;
  createPlan: () => void;
  movePlanEntry: (id: string, day: number) => void;
  togglePlanEntry: (id: string) => void;
}
const Context = createContext<TrainingState | null>(null);
export function TrainingProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [draft, updateDraft] = useState<TrainingSession>(EMPTY_SESSION);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [answers, setAnswers] = useState<TrainingAnswers>(DEFAULT_ANSWERS);
  const [plan, setPlan] = useState<TrainingWeekPlan | null>(null);
  const toggleFavorite = (id: string) => setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const addToDraft = (exerciseId: string) => {
    const exercise = getExercise(exerciseId);
    if (!exercise || exercise.area === 'rehab') return;
    updateDraft(previous => previous.exercises.some(item => item.exerciseId === exerciseId) ? previous : { ...previous, exercises: [...previous.exercises, { ...makeSessionItem(exerciseId), id: crypto.randomUUID() }] });
  };
  const saveDraft = () => {
    if (!draft.title.trim() || !draft.exercises.length) return null;
    const id = crypto.randomUUID();
    setSessions(previous => [...previous, { ...draft, id, title: draft.title.trim(), minutes: getSessionMinutes(draft) }]);
    updateDraft(EMPTY_SESSION);
    return id;
  };
  const updateSession = (id: string, update: Partial<TrainingSession>) => setSessions(previous => previous.map(session => session.id === id ? { ...session, ...update } : session));
  const replaceExercise = (sessionId: string, itemId: string, exerciseId: string) => {
    const exercise = getExercise(exerciseId);
    if (!exercise || exercise.area === 'rehab') return;
    setSessions(previous => previous.map(session => session.id === sessionId ? { ...session, exercises: session.exercises.map(item => item.id === itemId ? { ...makeSessionItem(exerciseId), id: item.id } : item) } : session));
  };
  const createPlan = () => {
    const usable = TRAINING_EXERCISES.filter(exercise => exercise.area !== 'rehab' && (answers.equipment.includes(exercise.equipment) || (answers.equipment.includes('Ohne Gerät') && exercise.equipment === 'Körpergewicht')));
    const focus = answers.weaknesses.find(value => value !== 'Weiß ich nicht') || (answers.goal === 'Technik verbessern' ? 'Fußtechnik' : 'Körperposition');
    const focusExercises = usable.filter(exercise => exercise.area === 'boulder' && exercise.topic === focus);
    const wallExercises = focusExercises.length ? focusExercises : usable.filter(exercise => exercise.area === 'boulder');
    const strengthCandidates = usable.filter(exercise => exercise.area === 'strength' && (exercise.id !== 'pullup' || !['0', 'Weiß ich nicht', 'Mit Unterstützung'].includes(answers.pullUps)));
    const strengthExercises = strengthCandidates.filter((exercise, index) => strengthCandidates.findIndex(candidate => candidate.topic === exercise.topic) === index);
    const days = [...new Set(answers.days)].sort((a, b) => a - b);
    const generated = days.map((day, index): TrainingSession => {
      const fixed = answers.fixedDays.includes(day);
      const strengthDay = !fixed && (wallExercises.length === 0 || answers.goal === 'Kraft aufbauen' || (index % 2 === 1 && strengthExercises.length > 0));
      const available = fixed ? [] : strengthDay ? strengthExercises : wallExercises.length ? wallExercises : strengthExercises;
      const count = Math.max(1, Math.min(3, Math.floor(answers.minutes / 20)));
      const chosen = available.slice(0, count);
      return { id: `preview-${day}`, title: fixed ? 'Dein fester Trainingstermin' : strengthDay ? 'Krafttraining' : `Technik · ${focus}`, focus: fixed ? 'Bestehender Termin' : strengthDay ? 'Kraft' : focus, minutes: answers.minutes, exercises: chosen.map((exercise, i) => makeSessionItem(exercise.id, i)) };
    });
    setSessions(previous => [...previous.filter(session => !session.id.startsWith('preview-')), ...generated]);
    setPlan({ entries: generated.map((session, i) => ({ id: `entry-${days[i]}`, day: days[i], sessionId: session.id, completed: false, fixed: answers.fixedDays.includes(days[i]) })), summary: `${days.length} Trainingstage · ${answers.minutes} Min. je Termin · ${answers.goal}${answers.constraints !== 'Keine' ? ' · Einschränkungen müssen vor einer echten Planung fachlich berücksichtigt werden.' : ''}` });
  };
  const movePlanEntry = (id: string, day: number) => setPlan(previous => !previous || previous.entries.some(entry => entry.day === day) ? previous : { ...previous, entries: previous.entries.map(entry => entry.id === id && !entry.fixed ? { ...entry, day } : entry) });
  const togglePlanEntry = (id: string) => setPlan(previous => previous ? { ...previous, entries: previous.entries.map(entry => entry.id === id ? { ...entry, completed: !entry.completed } : entry) } : previous);
  return <Context.Provider value={{ favorites, toggleFavorite, draft, updateDraft, addToDraft, saveDraft, sessions, updateSession, replaceExercise, answers, setAnswers, plan, createPlan, movePlanEntry, togglePlanEntry }}>{children}</Context.Provider>;
}
export function useTraining() {
  const value = useContext(Context);
  if (!value) throw new Error('TrainingProvider fehlt');
  return value;
}
