/**
 * Types for the user profile and leaderboard entries.
 */
export interface UserProfile {
  displayName: string;
  realName?: string;
  dob: string;
  nation: string;
  email: string;
  syncId?: string;
  avatar?: string;
  phoneNumber?: string;
  isFocusPublic?: boolean;
  isPublic?: boolean;
}

export interface GlobalProfile {
  // 🛡️ PII fields — only present in authenticated own-profile context, NEVER in public leaderboard
  sync_id?: string;
  dob?: string;
  phone_number?: string;
  email?: string;
  is_public?: boolean;

  // Public fields — safe for leaderboard display
  display_name: string;
  User_name?: string;
  age?: number | null; // Server-computed from DOB (raw DOB never exposed)
  nation: string;
  total_hours: number;
  today_hours: number;
  current_rank: string;
  is_focusing_now: boolean;
  last_active: string; // ISO String
  avatar?: string;
  current_focus_subject?: string | null;
  is_focus_public: boolean;
  is_online: boolean; // true if last_active within 60s (set by server)
  integrity_score?: number;
  is_verified?: boolean;
  competitive_score?: number;
  current_streak?: number;
}

export interface StudySession {
  id: string;
  user_id: string;
  duration: number;
  subject: string;
  note?: string;
  start_at?: string;
  end_at: string; // ISO String
  log_date?: string; // YYYY-MM-DD
  session_number?: number;
}
