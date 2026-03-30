/**
 * Badge system
 *
 * Checks badge unlock conditions against tracker data and renders the badge grid.
 */

import { appState } from '@/state/app-state';
import { BADGES } from '@/config/constants';
import { saveSettingsToStorage } from '@/services/data-bridge';
import { showToast, startConfetti } from '@/utils/dom.utils';

/** Checks all badges and unlocks any newly earned ones */
export function checkBadges(): void {
  const data = appState.trackerData;
  let newBadge = false;

  for (const badge of BADGES) {
    if (appState.settings.unlockedBadges.includes(badge.id)) continue;
    if (badge.condition(data)) {
      appState.settings.unlockedBadges.push(badge.id);
      newBadge = true;
      showToast(`Badge Unlocked: ${badge.icon} ${badge.name}!`, 'success', 5000);
    }
  }

  if (newBadge) {
    saveSettingsToStorage(appState.settings);
    startConfetti();
  }
}

/** Renders the badge grid in the dashboard */
export function renderBadges(): void {
  const container = document.getElementById('badgeGrid');
  if (!container) return;

  container.innerHTML = BADGES.map((badge) => {
    const unlocked = appState.settings.unlockedBadges.includes(badge.id);
    return `
      <div class="badge ${unlocked ? 'unlocked' : 'locked'}" title="${badge.description}">
        <div class="badge-icon-wrap">
          <span class="badge-icon">${badge.icon || '🏅'}</span>
          <span class="badge-status-dot">${unlocked ? '✓' : '🔒'}</span>
        </div>
        <span class="badge-name">${badge.name}</span>
        <span class="badge-desc">${badge.description}</span>
      </div>
    `;
  }).join('');
}
