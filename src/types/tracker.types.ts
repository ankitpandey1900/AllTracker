/**
 * Main types for the tracker data.
 * 
 * Each day in the tracker is stored as a `TrackerDay`.
 * We also define the Settings and Badge layouts here.
 */

// --- Day Entry ---

/** Data for one specific day in the tracker */
export interface TrackerDay {
  day: number;
  date: string;
  /** Array of hours for each study category. Index matches Settings.columns. */
  studyHours: number[];
  topics: string;
  problemsSolved: number;
  project: string;
  completed: boolean;
  /** If true, this day is a "Rest Day" and doesn't break streaks. */
  restDay?: boolean;
}

// --- Column Setup ---

/** A study category with its target hours */
export interface StudyCategory {
  name: string;
  target: number;
}

/** A date-range override for column names and targets */
export interface CustomRange {
  startDay: number;
  endDay: number;
  /** Overridden categories for this range. */
  columns: StudyCategory[];
}

// --- Timer Logs ---

/** A single study session from the timer */
export interface SessionLog {
  date: string;
  category: string;
  categoryName: string;
  duration: number;
  timeRange: string;
  note?: string;
}

export interface MentorMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: MentorMessage[];
  createdAt: number;
  lastActive: number;
  pinned?: boolean;
}

// --- App Settings ---

/** Global settings that we save to storage */
export interface Settings {
  startDate: string;
  endDate: string;
  /** Unified list of study categories. */
  columns: StudyCategory[];
  customRanges: CustomRange[];
  beastMode: boolean;
  unlockedBadges: string[];
  sessionLogs: SessionLog[];
  groqApiKey?: string;
  maamuModel?: string;
  chatSessions?: ChatSession[];    // Multi-session history
  activeSessionId?: string;       // Multi-session history
  theme?: 'kaala' | 'default' | 'chanakya-strategy' | 'ayodhya' | 'kamala-grace' | 'vajra-shakti'; // App Theme
  sessionGoal?: string;           // Target hours for current phase
}

// --- Badges ---

/** A badge that can be unlocked by meeting a condition */
export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (data: TrackerDay[]) => boolean;
}

// --- Rank System ---

/** Tier definition for the gamified rank system */
export interface RankTier {
  name: string;
  min: number;
  max: number;
  color: string;
}

/** Computed rank details for a given hour total */
export interface RankDetails extends RankTier {
  division: string;
  title: string;
  worldPos: string;
  tierXP: number;
  level: number;
  absolutePos: number;
}

