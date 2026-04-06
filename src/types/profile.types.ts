export interface UserProfile {
  displayName: string;
  age: number | string;
  nation: string;
  syncId?: string;
  avatar?: string;
}

export interface GlobalProfile {
  sync_id: string; // Private
  display_name: string;
  age: number | string;
  nation: string;
  total_hours: number;
  today_hours: number;
  current_rank: string;
  is_focusing_now: boolean;
  last_active: string; // ISO String
  avatar?: string;
}
