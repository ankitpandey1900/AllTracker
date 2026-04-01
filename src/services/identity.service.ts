/**
 * Identity service — Account Migration & Identity Protocol
 *
 * Handles the "Reset Secret Key" (Password) mission, ensuring high-fidelity
 * data portability and security between different Sync IDs.
 */

import { SUPABASE_TABLES, STORAGE_KEYS } from '@/config/constants';
import { transferCloudRecord, updateSyncStatus } from '@/services/supabase.service';
import { getCurrentUserId } from '@/services/auth.service';

/** Moves all cloud data from current Secret Key to a new one */
export async function initiateIdentityMigration(newSecretKey: string): Promise<boolean> {
  const currentId = getCurrentUserId();
  if (!currentId || !newSecretKey || currentId === newSecretKey) return false;

  console.log('Initiating Identity Migration (Key Transfer)...');
  updateSyncStatus('syncing');

  try {
    const tables = Object.values(SUPABASE_TABLES);

    // 1. Transfer rows one by one for all mission tables
    for (const table of tables) {
      console.log(`Migrating ${table}...`);
      await transferCloudRecord(table, currentId, newSecretKey);
    }

    // 2. Clear old data from cloud (Optional but recommended for privacy)
    // await deleteOldSyncIdData(currentId);

    // 3. Update local session to new identity
    localStorage.setItem(STORAGE_KEYS.SYNC_ID, newSecretKey);
    
    // 4. Force reload session with new ID
    window.location.reload();
    
    return true;
  } catch (err) {
    console.error('Critical Failure during Identity Migration:', err);
    updateSyncStatus('error');
    alert('Mission Failed. Data remains secure under the old key. Error: ' + err);
    return false;
  }
}

/** Binds a Username to the current Sync ID if not already established */
export function bindIdentityToLocalProfile(username: string): void {
  const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!saved) return;

  const profile = JSON.parse(saved);
  profile.displayName = username;

  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  localStorage.setItem('tracker_username', username);
}
