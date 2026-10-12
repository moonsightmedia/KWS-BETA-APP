export type TrainingArea = 'strength' | 'boulder' | 'rehab';
export type TrainingEquipment = 'Körpergewicht' | 'Kurzhanteln' | 'Widerstandsband' | 'Klimmzugstange' | 'Boulderwand' | 'Ohne Gerät';

export interface TrainingExercise {
  id: string;
  area: TrainingArea;
  title: string;
  topic: string;
  goal: string;
  equipment: TrainingEquipment;
  level: string;
  minutes: number;
  steps: string[];
  dose: string;
  rest: string;
  easier: string;
  harder: string;
  note: string;
  keywords: string[];
  sources: { label: string; url: string; context: string }[];
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  sets: number;
  repetitions: string;
  restSeconds: number;
}

export interface TrainingSession {
  id: string;
  title: string;
  focus: string;
  minutes: number;
  exercises: SessionExercise[];
}

export interface TrainingAnswers {
  goal: string;
  experience: string;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  pullUps: string;
  pushUps: string;
  strengthExperience: string;
  days: number[];
  fixedDays: number[];
  minutes: number;
  equipment: TrainingEquipment[];
  constraints: string;
}

export interface TrainingWeekEntry {
  id: string;
  day: number;
  sessionId: string;
  completed: boolean;
  fixed: boolean;
}

export interface TrainingWeekPlan {
  entries: TrainingWeekEntry[];
  summary: string;
}
