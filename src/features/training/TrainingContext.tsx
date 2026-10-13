import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { DEFAULT_ANSWERS, EMPTY_SESSION, getExercise, getSessionMinutes, makeSessionItem } from './data';
import { buildTrainingPlan } from './planBuilder';
import { emptyTraining, readTraining, trainingStorageKey, writeTraining } from './storage';
import { completionOrigin, recordTrainingCompletion, repeatTrainingCompletion } from './trainingHistory';
import type { TrainingAnswers, TrainingCompletion, TrainingPlanIssue, TrainingSession, TrainingWeekPlan } from './types';

interface TrainingState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  draft: TrainingSession;
  updateDraft: Dispatch<SetStateAction<TrainingSession>>;
  addToDraft: (exerciseId: string) => void;
  addToSession: (sessionId: string, exerciseId: string) => void;
  saveDraft: () => string | null;
  sessions: TrainingSession[];
  updateSession: (id: string, update: Partial<TrainingSession>) => void;
  replaceExercise: (sessionId: string, itemId: string, exerciseId: string) => void;
  answers: TrainingAnswers;
  setAnswers: Dispatch<SetStateAction<TrainingAnswers>>;
  plan: TrainingWeekPlan | null;
  createPlan: () => { status: 'draft' | 'needs-review'; issues: TrainingPlanIssue[] };
  storageStatus: 'saved' | 'unavailable';
  clearSavedTraining: () => void;
  scheduleSession: (sessionId: string, day: number) => boolean;
  movePlanEntry: (id: string, day: number) => void;
  togglePlanEntry: (id: string) => void;
  history: TrainingCompletion[];
  completeSession: (sessionId: string) => boolean;
  undoCompletion: (id: string) => void;
  repeatCompletion: (id: string) => string | null;
}
const Context = createContext<TrainingState | null>(null);
export function TrainingProvider({ children, accountId = 'training-demo' }: { children: ReactNode; accountId?: string }) {
  const [initial] = useState(() => readTraining(accountId));
  const [favorites, setFavorites] = useState<string[]>(initial.favorites);
  const [draft, updateDraft] = useState<TrainingSession>(initial.draft);
  const [sessions, setSessions] = useState<TrainingSession[]>(initial.sessions);
  const [answers, setAnswers] = useState<TrainingAnswers>(DEFAULT_ANSWERS);
  const [plan, setPlan] = useState<TrainingWeekPlan | null>(initial.plan);
  const [history, setHistory] = useState<TrainingCompletion[]>(initial.history);
  const [storageStatus, setStorageStatus] = useState<'saved' | 'unavailable'>('saved');
  useEffect(() => { setStorageStatus(writeTraining(accountId, { favorites, draft, sessions, plan, history }) ? 'saved' : 'unavailable'); }, [accountId, favorites, draft, sessions, plan, history]);
  useEffect(() => {
    const restore = (event: StorageEvent) => {
      if (event.key !== trainingStorageKey(accountId) && event.key !== null) return;
      const saved = readTraining(accountId);
      setFavorites(saved.favorites); updateDraft(saved.draft); setSessions(saved.sessions); setPlan(saved.plan); setHistory(saved.history);
    };
    window.addEventListener('storage', restore);
    return () => window.removeEventListener('storage', restore);
  }, [accountId]);
  const clearSavedTraining = () => { const cleared = emptyTraining(); setFavorites(cleared.favorites); updateDraft(cleared.draft); setSessions(cleared.sessions); setPlan(null); setHistory([]); setAnswers(DEFAULT_ANSWERS); };
  const scheduleSession = (sessionId: string, day: number) => {
    if (!sessions.some(session => session.id === sessionId) || !Number.isInteger(day) || day < 0 || day > 6 || plan?.entries.some(entry => entry.day === day || entry.sessionId === sessionId) || plan?.status === 'needs-review') return false;
    setPlan(previous => ({ ...(previous ?? { id: crypto.randomUUID(), summary: 'Deine selbst zusammengestellte Woche', status: 'draft' }), entries: [...(previous?.entries ?? []), { id: crypto.randomUUID(), day, sessionId, fixed: false, completed: false }] }));
    return true;
  };
  const toggleFavorite = (id: string) => setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const addToDraft = (exerciseId: string) => {
    const exercise = getExercise(exerciseId);
    if (!exercise || exercise.area === 'rehab' || !exercise.defaultDose || exercise.contentKind === 'orientation') return;
    updateDraft(previous => previous.exercises.some(item => item.exerciseId === exerciseId) ? previous : { ...previous, exercises: [...previous.exercises, { ...makeSessionItem(exerciseId), id: crypto.randomUUID() }] });
  };
  const saveDraft = () => {
    if (!draft.title.trim() || !draft.exercises.length || draft.exercises.some(item => !item.repetitions.trim())) return null;
    const id = crypto.randomUUID();
    setSessions(previous => [...previous, { ...draft, id, title: draft.title.trim(), minutes: getSessionMinutes(draft) }]);
    updateDraft(EMPTY_SESSION);
    return id;
  };
  const addToSession = (sessionId: string, exerciseId: string) => {
    const exercise = getExercise(exerciseId);
    if (!exercise || exercise.area === 'rehab' || !exercise.defaultDose || exercise.contentKind === 'orientation' || plan?.entries.some(entry => entry.sessionId === sessionId && entry.fixed)) return;
    setSessions(previous => previous.map(session => {
      if (session.id !== sessionId || session.exercises.some(item => item.exerciseId === exerciseId)) return session;
      const updated = { ...session, exercises: [...session.exercises, { ...makeSessionItem(exerciseId), id: crypto.randomUUID(), reason: 'Von dir zu dieser Einheit ergänzt.' }] };
      return { ...updated, minutes: getSessionMinutes(updated) };
    }));
  };
  const updateSession = (id: string, update: Partial<TrainingSession>) => {
    if (plan?.entries.some(entry => entry.sessionId === id && entry.fixed)) return;
    setSessions(previous => previous.map(session => { const updated = { ...session, ...update }; return session.id === id ? { ...updated, minutes: getSessionMinutes(updated) } : session; }));
  };
  const replaceExercise = (sessionId: string, itemId: string, exerciseId: string) => {
    const exercise = getExercise(exerciseId);
    if (!exercise || exercise.area === 'rehab' || !exercise.defaultDose || exercise.contentKind === 'orientation' || plan?.entries.some(entry => entry.sessionId === sessionId && entry.fixed)) return;
    setSessions(previous => previous.map(session => {
      if (session.id !== sessionId) return session;
      const updated = { ...session, exercises: session.exercises.map(item => item.id === itemId ? { ...makeSessionItem(exerciseId), id: item.id, reason: 'Von dir als Ersatz für diese Einheit ausgewählt.' } : item) };
      return { ...updated, minutes: getSessionMinutes(updated) };
    }));
  };
  const createPlan = () => {
    const result = buildTrainingPlan(answers);
    setSessions(previous => [...previous.filter(session => !session.id.startsWith('preview-')), ...result.sessions]);
    setPlan({ ...result.plan, id: crypto.randomUUID() });
    return { status: result.plan.status ?? 'draft', issues: result.issues };
  };
  const movePlanEntry = (id: string, day: number) => setPlan(previous => !previous || previous.entries.some(entry => entry.day === day) ? previous : { ...previous, entries: previous.entries.map(entry => entry.id === id && !entry.fixed ? { ...entry, day } : entry) });
  const togglePlanEntry = (id: string) => {
    const entry = plan?.entries.find(item => item.id === id);
    if (!plan || !entry) return;
    const originKey = completionOrigin(plan, id);
    const session = sessions.find(item => item.id === entry.sessionId);
    if (!entry.fixed && !entry.completed && !session?.exercises.length) return;
    if (entry.completed) setHistory(previous => previous.filter(item => item.originKey !== originKey));
    else if (!entry.fixed && session) setHistory(previous => recordTrainingCompletion(previous, session, originKey));
    setPlan({ ...plan, entries: plan.entries.map(item => item.id === id ? { ...item, completed: !item.completed } : item) });
  };
  const completeSession = (sessionId: string) => {
    const session = sessions.find(item => item.id === sessionId);
    const entry = plan?.entries.find(item => item.sessionId === sessionId);
    if (!session?.exercises.length || entry?.fixed || entry?.completed) return false;
    if (entry) { togglePlanEntry(entry.id); return true; }
    const next = recordTrainingCompletion(history, session);
    if (next === history) return false;
    setHistory(next);
    return true;
  };
  const undoCompletion = (id: string) => {
    const completion = history.find(item => item.id === id);
    setHistory(previous => previous.filter(item => item.id !== id));
    if (plan && completion?.originKey) setPlan({ ...plan, entries: plan.entries.map(entry => completionOrigin(plan, entry.id) === completion.originKey ? { ...entry, completed: false } : entry) });
  };
  const repeatCompletion = (id: string) => {
    const completion = history.find(item => item.id === id);
    if (!completion) return null;
    const session = repeatTrainingCompletion(completion);
    setSessions(previous => [...previous, session]);
    return session.id;
  };
  return <Context.Provider value={{ favorites, toggleFavorite, draft, updateDraft, addToDraft, addToSession, saveDraft, sessions, updateSession, replaceExercise, answers, setAnswers, plan, createPlan, storageStatus, clearSavedTraining, scheduleSession, movePlanEntry, togglePlanEntry, history, completeSession, undoCompletion, repeatCompletion }}>{children}</Context.Provider>;
}
export function useTraining() {
  const value = useContext(Context);
  if (!value) throw new Error('TrainingProvider fehlt');
  return value;
}
