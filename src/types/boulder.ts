export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'elite';
export type BoulderColor = 'Grün' | 'Gelb' | 'Blau' | 'Orange' | 'Rot' | 'Schwarz' | 'Weiß' | 'Lila';

export interface Boulder {
  id: string;
  name: string;
  sector: string;
  difficulty: Difficulty;
  color: BoulderColor;
  betaVideoUrl?: string;
  note?: string;
  createdAt: Date;
}

export interface Sector {
  id: string;
  name: string;
  boulderCount: number;
  description?: string;
}

export interface Statistics {
  totalBoulders: number;
  lastUpdate: Date;
  newBouldersCount: number;
  difficultyDistribution: Record<Difficulty, number>;
  colorDistribution: Record<BoulderColor, number>;
}
