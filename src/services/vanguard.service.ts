
import { appState } from '@/state/app-state';
import { getSecureLocalProfileString } from '@/utils/security';
import { fetchLeaderboard } from '@/services/vault.service';

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
   */
  static async getRivalContext(): Promise<RivalContext | null> {
    try {
      const users = await fetchLeaderboard();
      const profileData = getSecureLocalProfileString();
      const myName = profileData ? JSON.parse(profileData).displayName : null;
      if (!myName) return null;

      const sorted = [...users].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
      const myIndex = sorted.findIndex(u => u.display_name === myName);

      if (myIndex <= 0) return null; // Top of the board or not found

      const rival = sorted[myIndex - 1];
      return {
        handle: `@${rival.display_name}`,
        gap: Number((rival.total_hours - sorted[myIndex].total_hours).toFixed(1)),
        rank: myIndex,
      };
    } catch (e) {
      console.error('[Vanguard] Rivalry calculate fail:', e);
      return null;
    }
  }
}
