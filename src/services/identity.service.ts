import { supabaseClient } from '@/config/supabase';
import { SUPABASE_TABLES, STORAGE_KEYS } from '@/config/constants';
import { getCurrentUserId } from '@/services/auth.service';

/**
 * Identity Migration Service (Legacy Support)
 * 
 * Manages the process of re-linking cloud archives to a new Secret Key.
 * This ensures directives from the Profile HUD (initiateIdentityMigration) 
 * remain fully operational.
 */
export async function initiateIdentityMigration(newKey: string): Promise<boolean> {
  const currentSyncId = getCurrentUserId();
  if (!currentSyncId) return false;

  try {
    const { error } = await supabaseClient!
      .from(SUPABASE_TABLES.PROFILES)
      .update({ sync_id: newKey })
      .eq('sync_id', currentSyncId);

    if (error) {
      console.error('Identity Migration Error:', error);
      return false;
    }

    // Success: Profile updated in cloud. Now local update and refresh.
    // Note: auth.service handles the actual masking, but we update the raw key here for sync.
    localStorage.setItem(STORAGE_KEYS.SYNC_ID, newKey);
    window.location.reload();
    return true;
  } catch (err) {
    console.error('Fatal Identity Migration Failure:', err);
    return false;
  }
}
