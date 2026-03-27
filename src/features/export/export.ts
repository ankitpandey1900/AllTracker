/**
 * Export feature
 *
 * Comprehensive data export: 6 individual exports + master export.
 * Deduplicates the previously duplicated export code.
 */

import { appState, getColumnNames } from '@/state/app-state';
import { arrayToCSV, downloadFile } from '@/utils/csv.utils';
import { generateExportTimestamp } from '@/utils/date.utils';
import { showToast, startConfetti } from '@/utils/dom.utils';

// ─── 1. Tracker Data CSV ─────────────────────────────────────

export function exportTrackerDataCSV(): void {
  const timestamp = generateExportTimestamp();
  const exportData = appState.trackerData.map((day) => {
    const cols = getColumnNames(day.day);
    const h1 = day.pythonHours || 0, h2 = day.dsaHours || 0, h3 = day.projectHours || 0, h4 = day.col4Hours || 0;
    return {
      Day: day.day, Date: day.date, Col1_Name: cols.col1, Col1_Hrs: h1,
      Col2_Name: cols.col2, Col2_Hrs: h2, Col3_Name: cols.col3, Col3_Hrs: h3,
      Col4_Name: cols.col4, Col4_Hrs: h4, Problems: day.dsaProblems || 0,
      Topics: (day.topics || '').replace(/\n/g, ' '), Project: (day.project || '').replace(/\n/g, ' '), Completed: day.completed ? 'Yes' : 'No',
      Total_Hrs: (h1 + h2 + h3 + h4).toFixed(2),
    };
  });
  const headers = ['Day', 'Date', 'Col1_Name', 'Col1_Hrs', 'Col2_Name', 'Col2_Hrs', 'Col3_Name', 'Col3_Hrs', 'Col4_Name', 'Col4_Hrs', 'Problems', 'Topics', 'Project', 'Completed', 'Total_Hrs'];
  downloadFile(arrayToCSV(exportData, headers), `tracker_data_${timestamp}.csv`);
}

// ─── 2. Session Logs CSV ─────────────────────────────────────

function exportSessionLogsCSV(): void {
  const timestamp = generateExportTimestamp();
  const logs = appState.settings.sessionLogs || [];
  const exportData = logs.map((log) => {
    const d = new Date(log.date);
    return { Timestamp: log.date, Date: d.toLocaleDateString(), Time: d.toLocaleTimeString(), Category: log.category, CategoryName: log.categoryName, DurationHours: log.duration.toFixed(2), TimeRange: log.timeRange || '' };
  });
  downloadFile(arrayToCSV(exportData, ['Timestamp', 'Date', 'Time', 'Category', 'CategoryName', 'DurationHours', 'TimeRange']), `session_logs_${timestamp}.csv`);
}

// ─── 3. Routines CSV ─────────────────────────────────────────

function exportRoutinesCSV(): void {
  const timestamp = generateExportTimestamp();
  const exportData = appState.routines.map((routine) => {
    const completionDates = Object.keys(appState.routineHistory).filter((d) => (appState.routineHistory[d] || 0) > 0).sort().reverse();
    return { RoutineID: routine.id, Title: routine.title || '', ScheduledTime: routine.time || '', Notes: (routine.note || '').replace(/\n/g, ' '), CurrentlyCompleted: routine.completed ? 'Yes' : 'No', LastCompletedDate: completionDates[0] || 'Never', TotalCompletionDays: completionDates.length, CompletionDates: completionDates.join('; ') };
  });
  downloadFile(arrayToCSV(exportData, ['RoutineID', 'Title', 'ScheduledTime', 'Notes', 'CurrentlyCompleted', 'LastCompletedDate', 'TotalCompletionDays', 'CompletionDates']), `routines_habit_tracker_${timestamp}.csv`);
}


// ─── 5. Bookmarks CSV ───────────────────────────────────────

function exportBookmarksCSV(): void {
  const timestamp = generateExportTimestamp();
  const exportData = appState.bookmarks.map((b) => ({ BookmarkID: b.id, Title: b.title, URL: b.url, Category: b.category }));
  downloadFile(arrayToCSV(exportData, ['BookmarkID', 'Title', 'URL', 'Category']), `bookmarks_${timestamp}.csv`);
}

// ─── 6. Settings JSON ───────────────────────────────────────

function exportSettingsJSON(): void {
  const timestamp = generateExportTimestamp();
  const metadata = {
    exportDate: new Date().toISOString(), appVersion: '2.0',
    settings: appState.settings, totalDays: appState.totalDays,
    dataStats: { trackerEntries: appState.trackerData.length, sessionLogs: (appState.settings.sessionLogs || []).length, routines: appState.routines.length, bookmarks: appState.bookmarks.length, unlockedBadges: appState.settings.unlockedBadges.length },
  };
  downloadFile(JSON.stringify(metadata, null, 2), `settings_metadata_${timestamp}.json`, 'application/json');
}

// ─── Master Export ───────────────────────────────────────────

export function exportAllData(): void {
  const fns = [
    { name: 'Tracker Data', fn: exportTrackerDataCSV },
    { name: 'Session Logs', fn: exportSessionLogsCSV },
    { name: 'Routines', fn: exportRoutinesCSV },
    { name: 'Bookmarks', fn: exportBookmarksCSV },
    { name: 'Settings', fn: exportSettingsJSON },
  ];

  showToast('Starting comprehensive export... 📥', 'info');
  let count = 0;

  fns.forEach((item, index) => {
    setTimeout(() => {
      try {
        item.fn();
        count++;
        showToast(`✓ ${item.name} exported`, 'info', 2000);
        if (index === fns.length - 1) {
          setTimeout(() => {
            showToast(`✅ Export Complete! ${count} files downloaded.`, 'success', 5000);
            startConfetti();
          }, 1000);
        }
      } catch (err: unknown) {
        console.error(`Error exporting ${item.name}:`, err);
        showToast(`⚠️ Error exporting ${item.name}`, 'error', 3000);
      }
    }, index * 800);
  });
}
