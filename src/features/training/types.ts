export type TrainingArea = 'strength' | 'boulder' | 'rehab';
export type TrainingEquipment = 'Körpergewicht' | 'Kurzhanteln' | 'Widerstandsband' | 'Klimmzugstange' | 'Boulderwand' | 'Ohne Gerät' | 'Kettlebell' | 'Trainingsbank' | 'EZ-Stange' | 'Fingerboard' | 'Spraywall';

/** Editorial starting dose; not a clinically validated individual prescription. */
export interface TrainingDose {
  sets: number;
  repetitions: string;
  repetitionUnit?: 'Wiederholungen' | 'Versuche' | 'Haltephasen';
  restSeconds: number;
  restScope: 'sets' | 'repetitions';
  secondsPerRepetition: number;
  setupMinutes: number;
  sideMultiplier?: number;
}

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
  cues?: string[];
  mistakes?: string[];
  selectionReason?: string;
  setupRequirements?: string[];
  defaultDose?: TrainingDose;
  requiresCoach?: boolean;
  requiredEquipment?: TrainingEquipment[];
  alternativeEquipment?: TrainingEquipment[];
  contentKind?: 'exercise' | 'orientation';
  format?: 'drill' | 'game';
  /** Reusable illustration of the movement, not a separate execution tutorial. */
  illustrationId?: string;
  kwsAvailable?: boolean;
  /** Does not certify execution; identifies candidates for the draft generator. */
  planEligible?: boolean;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  sets: number;
  repetitions: string;
  restSeconds: number;
  restScope?: 'sets' | 'repetitions';
  reason?: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  focus: string;
  minutes: number | null;
  exercises: SessionExercise[];
  rationale?: string;
  preparationMinutes?: number;
  cooldownMinutes?: number;
  budgetMinutes?: number;
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
  ageGroup?: 'adult' | 'minor' | 'unknown';
  coachGuided?: boolean;
}

export interface TrainingWeekEntry {
  id: string;
  day: number;
  sessionId: string;
  completed: boolean;
  fixed: boolean;
}

export interface TrainingWeekPlan {
  id?: string;
  entries: TrainingWeekEntry[];
  summary: string;
  status?: 'draft' | 'needs-review';
  notes?: string[];
}

/** A snapshot of an explicitly completed unit, independent of later plan edits. */
export interface TrainingCompletion {
  id: string;
  completedAt: string;
  session: TrainingSession;
  originKey?: string;
}

export interface TrainingPlanIssue {
  code: string;
  severity: 'blocking' | 'review' | 'note';
  message: string;
}

export interface TrainingPlanResult {
  sessions: TrainingSession[];
  plan: TrainingWeekPlan;
  issues: TrainingPlanIssue[];
}
