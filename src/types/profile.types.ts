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
}

export interface GlobalProfile {
  sync_id: string; // Private
  display_name: string;
  User_name?: string;
  dob: string;
  nation: string;
  total_hours: number;
  today_hours: number;
  current_rank: string;
  is_focusing_now: boolean;
  last_active: string; // ISO String
  avatar?: string;
  current_focus_subject?: string | null;
  phone_number?: string;
  is_focus_public: boolean;
  email?: string;
}
