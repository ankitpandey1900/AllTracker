import { GlobalProfile } from '@/types/profile.types';
import { getSecureLocalProfileString } from '@/utils/security';
import { calculateCompetitiveXP } from '@/utils/calc.utils';

export interface RivalContext {
  handle: string;
  gap: number;
  gapPoints: number;
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

    const sorted = [...users].sort((a, b) => {
      const scoreA = calculateCompetitiveXP(a.total_hours, a.current_streak || 0, a.integrity_score || 0);
      const scoreB = calculateCompetitiveXP(b.total_hours, b.current_streak || 0, b.integrity_score || 0);
      return scoreB - scoreA;
    });
    const myIndex = sorted.findIndex(u => u.display_name === myName);

    if (myIndex <= 0) return null; // Top of the board or not found

    const rival = sorted[myIndex - 1];
    const me = sorted[myIndex];
    
    const scoreA = calculateCompetitiveXP(rival.total_hours, rival.current_streak || 0, rival.integrity_score || 0);
    const scoreB = calculateCompetitiveXP(me.total_hours, me.current_streak || 0, me.integrity_score || 0);
    
    return {
      handle: `@${rival.display_name}`,
      gap: Number(((rival.total_hours || 0) - (me.total_hours || 0)).toFixed(1)),
      gapPoints: Math.max(0, Math.round(scoreA - scoreB)),
      rank: myIndex, 
    };
  }
}
