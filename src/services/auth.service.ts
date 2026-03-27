/**
 * Auth service — Sync ID management
 *
 * Provides a frictionless "login" via a text-based Sync ID.
 * No email/password required — users just pick an ID and their data syncs.
 */

import { STORAGE_KEYS } from '@/config/constants';
import { syncDataOnLogin } from '@/services/data-bridge';

// ─── State ───────────────────────────────────────────────────

let currentSyncId: string | null = localStorage.getItem(STORAGE_KEYS.SYNC_ID) || null;

// ─── Public API ──────────────────────────────────────────────

/** Returns the current Sync ID, or null if not connected */
export function getCurrentUserId(): string | null {
  return currentSyncId;
}

/** Initializes auth UI and restores previous session */
export function initSyncAuth(): void {
  if (currentSyncId) {
    handleSyncIdEstablished(currentSyncId);
  } else {
    handleUserSignedOut();
  }

  // Bind header button
  const triggerBtn = document.getElementById('authTriggerBtn');
  if (triggerBtn) triggerBtn.onclick = openAuthModal;

  // Bind modal close
  const closeBtn = document.getElementById('closeAuthModal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      const modal = document.getElementById('authModal');
      if (modal) modal.style.display = 'none';
    };
  }

  // Bind form submit
  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.onsubmit = (e) => {
      e.preventDefault();
      handleSyncIdSubmit();
    };
  }

  // Bind generate button
  const genBtn = document.getElementById('generateIdBtn');
  if (genBtn) {
    genBtn.onclick = () => {
      const randomId = 'user_' + Math.random().toString(36).substring(2, 7);
      const input = document.getElementById('syncIdInput') as HTMLInputElement | null;
      if (input) input.value = randomId;
    };
  }
}

/** Sets up the header scroll effect */
export function setupHeaderScroll(): void {
  const header = document.getElementById('appHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// ─── UI State ────────────────────────────────────────────────

async function handleSyncIdEstablished(syncId: string): Promise<void> {
  currentSyncId = syncId;
  localStorage.setItem(STORAGE_KEYS.SYNC_ID, syncId);
  console.log('Sync ID active:', syncId);

  const headerRight = document.getElementById('headerRight');
  if (headerRight) {
    headerRight.innerHTML = `
      <div class="user-info-group" style="display: flex; align-items: center; gap: 15px;">
        <span id="syncStatus" class="sync-status" style="font-size: 0.8rem; color: var(--success);">
          ✅ Synced
        </span>
        <span class="user-email" style="font-size: 0.85rem; color: var(--text-secondary); opacity: 0.8;">
          ID: ${syncId}
        </span>
        <button class="btn btn-secondary btn-sm" id="logoutBtn" style="padding: 5px 12px; font-size: 0.75rem;">
          Disconnect
        </button>
      </div>
    `;
    document.getElementById('logoutBtn')!.onclick = handleDisconnect;
  }

  // Hide modal
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';

  // Trigger sync
  await syncDataOnLogin();
}

function handleUserSignedOut(): void {
  currentSyncId = null;
  localStorage.removeItem(STORAGE_KEYS.SYNC_ID);
  console.log('Sync ID disconnected.');

  const headerRight = document.getElementById('headerRight');
  if (headerRight) {
    headerRight.innerHTML = `
      <button class="btn-auth-trigger" id="authTriggerBtn">
        <span class="icon">🚀</span> Sync / Login
      </button>
    `;
    document.getElementById('authTriggerBtn')!.onclick = openAuthModal;
  }
}

// ─── Actions ─────────────────────────────────────────────────

function openAuthModal(): void {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.style.display = 'flex';
    const errorDiv = document.getElementById('authError');
    if (errorDiv) errorDiv.style.display = 'none';
    modal.classList.add('active');

    const title = document.getElementById('authModalTitle');
    if (title) title.textContent = 'Connect Your Sync ID';
  }
}

async function handleSyncIdSubmit(): Promise<void> {
  const input = document.getElementById('syncIdInput') as HTMLInputElement | null;
  const submitBtn = document.getElementById('authSubmitBtn') as HTMLButtonElement | null;
  const errorDiv = document.getElementById('authError') as HTMLElement | null;

  const syncId = input?.value.trim() || '';
  if (!syncId) {
    if (errorDiv) {
      errorDiv.textContent = 'Please enter a valid Sync ID.';
      errorDiv.style.display = 'block';
    }
    return;
  }

  if (errorDiv) errorDiv.style.display = 'none';
  const originalText = submitBtn?.textContent || '';
  if (submitBtn) {
    submitBtn.textContent = 'Connecting...';
    submitBtn.disabled = true;
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await handleSyncIdEstablished(syncId);
  } catch (err: unknown) {
    if (errorDiv) {
      errorDiv.textContent = err instanceof Error ? err.message : 'Connection failed';
      errorDiv.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

async function handleDisconnect(): Promise<void> {
  if (confirm('Disconnect from cloud? Your local data will remain, but syncing will stop.')) {
    handleUserSignedOut();
  }
}
