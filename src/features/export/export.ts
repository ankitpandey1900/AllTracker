/**
 * Export feature
 *
 * Comprehensive data export: 6 individual exports + master export.
 * Deduplicates the previously duplicated export code.
 */

import { appState, getColumnsForDay } from '@/state/app-state';
import { arrayToCSV, downloadFile } from '@/utils/csv.utils';
import { generateExportTimestamp } from '@/utils/date.utils';
import { showToast, startConfetti } from '@/utils/dom.utils';

// ─── 1. Tracker Data CSV ─────────────────────────────────────

export function exportTrackerDataCSV(): void {
  const timestamp = generateExportTimestamp();
  
  // Find the maximum number of columns across all days to normalize headers
  let maxCols = 0;
  appState.trackerData.forEach(d => {
    maxCols = Math.max(maxCols, (d.studyHours || []).length);
  });

  const exportData = appState.trackerData.map((day) => {
    const cols = getColumnsForDay(day.day);
    const row: any = {
      Day: day.day,
      Date: day.date,
      Completed: day.completed ? 'Yes' : 'No',
      Problems_Solved: day.problemsSolved || 0,
      Topics: (day.topics || '').replace(/\n/g, ' '),
      Project: (day.project || '').replace(/\n/g, ' '),
    };

    let totalHrs = 0;
    for (let i = 0; i < maxCols; i++) {
        const catName = cols[i]?.name || `Category_${i+1}`;
        const hrs = (day.studyHours?.[i] || 0);
        row[`${catName}_Hrs`] = hrs;
        totalHrs += hrs;
    }
    
    row['Total_Hrs'] = totalHrs.toFixed(2);
    return row;
  });

  // Dynamically determine headers based on the first record's keys (or max columns)
  const baseHeaders = ['Day', 'Date', 'Completed', 'Problems_Solved'];
  const dynamicHeaders: string[] = [];
  const sampleCols = getColumnsForDay(1); // Use Day 1 as reference for column order if possible
  for(let i=0; i < maxCols; i++) {
    dynamicHeaders.push(`${sampleCols[i]?.name || `Category_${i+1}`}_Hrs`);
  }
  const footerHeaders = ['Topics', 'Project', 'Total_Hrs'];
  
  const finalHeaders = [...baseHeaders, ...dynamicHeaders, ...footerHeaders];
  downloadFile(arrayToCSV(exportData, finalHeaders), `tracker_data_${timestamp}.csv`);
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
