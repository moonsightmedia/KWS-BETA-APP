export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
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
  nextSchraubtermin?: Date;
  lastSchraubtermin?: Date;
  imageUrl?: string;
}

export interface Statistics {
  totalBoulders: number;
  lastUpdate: Date;
  newBouldersCount: number;
  difficultyDistribution: Record<Difficulty, number>;
  colorDistribution: Record<BoulderColor, number>;
}
