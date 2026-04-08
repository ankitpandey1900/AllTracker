/**
 * The UI Engine (Registry).
 * 
 * It manages how we inject all our HTML templates into the 
 * index.html file. This keeps our main file clean.
 */

export function injectHTML(containerId: string, html: string, position: 'prepend' | 'append' | 'replace' = 'replace'): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found for UI injection.`);
    return;
  }

  if (position === 'replace') {
    container.innerHTML = html;
  } else if (position === 'prepend') {
    container.insertAdjacentHTML('afterbegin', html);
  } else {
    container.insertAdjacentHTML('beforeend', html);
  }
}

/**
 * Registry of all UI Fragments
 */
export async function initUI(): Promise<void> {
    console.log("🛠️ Initializing UI Components...");

    // 1. Global HUD & Containers (Injected into body)
    const { hudView } = await import('@/components/hud.ui.ts');
    injectHTML('modal-root', hudView, 'append'); 

    // 2. Mobile Specific Navigation
    const { mobileNav } = await import('@/components/mobile-nav.ui.ts');
    injectHTML('modal-root', mobileNav, 'append');

    // 3. Main View Panes
    const { dashboardView } = await import('@/features/dashboard/dashboard.ui.ts');
    const { routineView } = await import('@/features/routines/routines.ui.ts');
    const { tasksView } = await import('@/features/tasks/tasks.ui.ts');
    const { intelligenceView } = await import('@/features/intelligence/intelligence.ui.ts');
    const { bookmarksView } = await import('@/features/bookmarks/bookmarks.ui.ts');
    
    injectHTML('dashboardPane', dashboardView);
    injectHTML('routinePane', routineView);
    injectHTML('tasksPane', tasksView);
    injectHTML('intelligencePane', intelligenceView);
    injectHTML('bookmarksPane', bookmarksView);

    // 4. Modals (Injected into #modal-root)
    const { profileModal } = await import('@/components/modals/profile-modal.ui.ts');
    const { shareModal } = await import('@/features/dashboard/share-modal.ui.ts');
    const { timerModal } = await import('@/components/modals/timer-modal.ui.ts');
    const { manualModal } = await import('@/components/modals/manual-modal.ui.ts');
    const { settingsModal } = await import('@/components/modals/settings-modal.ui.ts');
    const { quickEntryModal } = await import('@/components/modals/quick-entry-modal.ui.ts');
    const { weeklyModal } = await import('@/components/modals/weekly-modal.ui.ts');
    const { heatmapModal } = await import('@/components/modals/heatmap-modal.ui.ts');
    const { analyticsModal } = await import('@/components/modals/analytics-modal.ui.ts');
    const { badgesModal } = await import('@/components/modals/badges-modal.ui.ts');
    const { historyModal } = await import('@/components/modals/history-modal.ui.ts');
    const { importModal } = await import('@/components/modals/import-modal.ui.ts');
    const { routineModalContents } = await import('@/components/modals/routine-modal.ui.ts');
    const { bookmarkModal } = await import('@/components/modals/bookmark-modal.ui.ts');
    const { sessionNoteModal } = await import('@/components/modals/session-note-modal.ui.ts');
    const { authModal } = await import('@/components/modals/auth-modal.ui.ts');

    // Root Modal Container
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
        injectHTML('modal-root', profileModal, 'append');
        injectHTML('modal-root', shareModal, 'append');
        injectHTML('modal-root', timerModal, 'append');
        injectHTML('modal-root', manualModal, 'append');
        injectHTML('modal-root', settingsModal, 'append');
        injectHTML('modal-root', quickEntryModal, 'append');
        injectHTML('modal-root', weeklyModal, 'append');
        injectHTML('modal-root', heatmapModal, 'append');
        injectHTML('modal-root', analyticsModal, 'append');
        injectHTML('modal-root', badgesModal, 'append');
        injectHTML('modal-root', historyModal, 'append');
        injectHTML('modal-root', importModal, 'append');
        injectHTML('modal-root', routineModalContents, 'append');
        injectHTML('modal-root', bookmarkModal, 'append');
        injectHTML('modal-root', sessionNoteModal, 'append');
        injectHTML('modal-root', authModal, 'append');
    }

    console.log("✅ UI Architecture Layered Successfully.");
}
