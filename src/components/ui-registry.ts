import { log } from '@/utils/logger.utils';

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
    log.info('Initializing UI Components...', '🛠️');

    // 1. Feature Containers (Target the sections created by Shell.ts)
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

    // 2. Hud & Mobile Components
    const { hudView } = await import('@/components/hud.ui.ts');
    const { mobileNav } = await import('@/components/mobile-nav.ui.ts');
    injectHTML('modal-root', hudView, 'append'); 
    injectHTML('modal-root', mobileNav, 'append');

    // 3. Modals Injection (Into #modal-root)
    const modalModules = [
        import('@/components/modals/profile-modal.ui.ts').then(m => m.profileModal),
        import('@/features/dashboard/share-modal.ui.ts').then(m => m.shareModal),
        import('@/components/modals/timer-modal.ui.ts').then(m => m.timerModal),
        import('@/components/modals/manual-modal.ui.ts').then(m => m.manualModal),
        import('@/components/modals/settings-modal.ui.ts').then(m => m.settingsModal),
        import('@/components/modals/weekly-modal.ui.ts').then(m => m.weeklyModal),
        import('@/components/modals/heatmap-modal.ui.ts').then(m => m.heatmapModal),
        import('@/components/modals/analytics-modal.ui.ts').then(m => m.analyticsModal),
        import('@/components/modals/badges-modal.ui.ts').then(m => m.badgesModal),
        import('@/components/modals/history-modal.ui.ts').then(m => m.historyModal),
        import('@/components/modals/import-modal.ui.ts').then(m => m.importModal),
        import('@/components/modals/routine-modal.ui.ts').then(m => m.routineModalContents),
        import('@/components/modals/bookmark-modal.ui.ts').then(m => m.bookmarkModal),
        import('@/components/modals/session-note-modal.ui.ts').then(m => m.sessionNoteModal),
        import('@/components/modals/auth-modal.ui.ts').then(m => m.authModal)
    ];

    const templates = await Promise.all(modalModules);
    templates.forEach(html => injectHTML('modal-root', html, 'append'));

    log.success('UI Architecture Layered Successfully.');
}
