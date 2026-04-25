import { GlobalProfile } from '@/types/profile.types';
import { getSecureLocalProfileString } from '@/utils/security';

export interface RivalContext {
  handle: string;
  gap: number;
  rank: number;
}

/**
 * VANGUARD SERVICE
 * 
 * Handles competitive gamification: Rivalry detection.
 */
export class VanguardService {

  /**
   * Identifies the 'Target' — the user ranked exactly 1 spot above the current user.
   * Uses provided user list to avoid redundant API calls.
   */
  static getRivalContext(users: GlobalProfile[]): RivalContext | null {
    if (!users.length) return null;

    const profileData = getSecureLocalProfileString();
    const myName = profileData ? JSON.parse(profileData).displayName : null;
    if (!myName) return null;

    const sorted = [...users].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    const myIndex = sorted.findIndex(u => u.display_name === myName);

    if (myIndex <= 0) return null; // Top of the board or not found

    const rival = sorted[myIndex - 1];
    const me = sorted[myIndex];
    
    return {
      handle: `@${rival.display_name}`,
      gap: Number(((rival.total_hours || 0) - (me.total_hours || 0)).toFixed(1)),
      rank: myIndex, 
    };
  }
}
