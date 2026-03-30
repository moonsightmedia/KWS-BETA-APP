export type BoulderGradeFeedback = 'too_easy' | 'just_right' | 'too_hard';
export type BoulderTickStatus = 'attempted' | 'top' | 'flash';

export interface BoulderAttributeOption {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface BoulderComment {
  id: string;
  boulder_id: string;
  boulder_name?: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  author_name: string;
  author_email: string | null;
}

export interface BoulderTick {
  id: string;
  boulder_id: string;
  user_id: string;
  status: BoulderTickStatus;
  attempt_count: number | null;
  note: string | null;
  is_favorite: boolean;
  is_project: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoulderTrackingSession {
  id: string;
  boulder_id: string;
  user_id: string;
  session_date: string;
  result: BoulderTickStatus;
  attempt_count: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoulderTickSummary {
  flash_count: number;
  top_count: number;
  attempted_count: number;
  total_ticks: number;
}

export interface BoulderCommunityAttribute extends BoulderAttributeOption {
  count: number;
  selected: boolean;
}

export interface BoulderCommunitySummary {
  averageRating: number | null;
  ratingCount: number;
  myRating: number | null;
  gradeFeedbackCounts: Record<BoulderGradeFeedback, number>;
  myGradeFeedback: BoulderGradeFeedback | null;
  attributes: BoulderCommunityAttribute[];
  myTick: BoulderTick | null;
  tickSummary: BoulderTickSummary;
}
