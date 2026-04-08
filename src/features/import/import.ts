/**
 * Handles importing your study data (JSON/CSV).
 */

import { appState } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import { saveTrackerDataToStorage } from '@/services/data-bridge';
import { generateTable } from '@/features/tracker/tracker';
import { updateDashboard } from '@/features/dashboard/dashboard';
import { renderHeatmap } from '@/features/heatmap/heatmap';
import { renderPerformanceCurve } from '@/features/routines/performance-chart';

// --- JSON Import ---

export function importFromJSON(): void {
  const jsonData = (document.getElementById('importJsonData') as HTMLTextAreaElement)?.value.trim();
  if (!jsonData) { showToast('Please paste JSON data to import.', 'error'); return; }

  try {
    const imported = JSON.parse(jsonData);
    if (!Array.isArray(imported)) { showToast('Invalid JSON format. Expected an array.', 'error'); return; }
    if (imported.length > 0 && !imported[0].hasOwnProperty('day')) { showToast('Invalid data structure. Missing required fields.', 'error'); return; }

    appState.trackerData = imported;
    saveTrackerDataToStorage(appState.trackerData);
    generateTable();
    updateDashboard();
    renderHeatmap();
    renderPerformanceCurve();

    document.getElementById('importModal')?.classList.remove('active');
    (document.getElementById('importJsonData') as HTMLTextAreaElement).value = '';
    showToast(`Successfully imported ${imported.length} days of data!`, 'success');
  } catch (e: unknown) {
    showToast('Error parsing JSON: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
  }
}

// --- CSV Import ---

export function importFromCSV(): void {
  const fileInput = document.getElementById('importCsvFile') as HTMLInputElement;
  const file = fileInput?.files?.[0];
  if (!file) { showToast('Please select a CSV file to import.', 'error'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      if (lines.length < 2) { showToast('CSV file appears to be empty or invalid.', 'error'); return; }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const dayIdx = headers.indexOf('Day');
      const dateIdx = headers.indexOf('Date');
      const completedIdx = headers.indexOf('Completed');

      const findCol = (patterns: string[]) => headers.findIndex((h) => patterns.some((p) => h.includes(p)));
      const hourColIndices = [
        findCol(['Col1_Hrs', 'Python Hours', 'Column 1']),
        findCol(['Col2_Hrs', 'DSA Hours', 'Column 2']),
        findCol(['Col3_Hrs', 'Project Hours', 'Column 3']),
        findCol(['Col4_Hrs', 'College', 'Column 4'])
      ];
      const topicsIdx = headers.indexOf('Topics') !== -1 ? headers.indexOf('Topics') : headers.indexOf('Topics Studied');
      const projectIdx = headers.indexOf('Project') !== -1 ? headers.indexOf('Project') : headers.indexOf('Project Worked On');
      const problemsIdx = headers.indexOf('Problems') !== -1 ? headers.indexOf('Problems') : headers.indexOf('DSA Problems Solved');

      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
        if (dayIdx === -1 || !values[dayIdx]) continue;
        const day = parseInt(values[dayIdx]);
        if (isNaN(day)) continue;

        let date = new Date();
        if (dateIdx !== -1 && values[dateIdx]) date = new Date(values[dateIdx]);

        const studyHours = hourColIndices.map(idx => (idx !== -1 ? parseFloat(values[idx]) || 0 : 0));

        imported.push({
          day, 
          date: date.toISOString(),
          studyHours,
          topics: topicsIdx !== -1 ? values[topicsIdx] || '' : '',
          problemsSolved: problemsIdx !== -1 ? parseInt(values[problemsIdx]) || 0 : 0,
          project: projectIdx !== -1 ? values[projectIdx] || '' : '',
          completed: completedIdx !== -1 ? values[completedIdx]?.toLowerCase() === 'yes' : false,
        });
      }

      if (imported.length === 0) { showToast('No valid data found in CSV file.', 'error'); return; }

      appState.trackerData = imported;
      saveTrackerDataToStorage(appState.trackerData);
      generateTable();
      updateDashboard();
      renderHeatmap();
      renderPerformanceCurve();

      document.getElementById('importModal')?.classList.remove('active');
      fileInput.value = '';
      showToast(`Successfully imported ${imported.length} days from CSV!`, 'success');
    } catch (e: unknown) {
      showToast('Error parsing CSV: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
    }
  };

  reader.readAsText(file);
}
