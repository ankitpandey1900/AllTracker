export interface Transmission {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;
  avatar: string;
  rank: string;
  content: string;
  focus_tag?: string | null;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  is_liked_by_me?: boolean;
  is_reposted_by_me?: boolean;
  is_mine?: boolean;
  total_hours?: number;
  current_streak?: number;
  competitive_score?: number;
}
