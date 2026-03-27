/**
 * Heatmap feature
 *
 * Renders study heatmaps (both inline and modal) showing daily study intensity.
 */

import { appState } from '@/state/app-state';
import { formatDate } from '@/utils/date.utils';
import { setTxt } from '@/utils/dom.utils';

// ─── Intensity Level ─────────────────────────────────────────

function getHeatmapLevel(hours: number): number {
  if (hours === 0) return 0;
  if (hours < 2) return 1;
  if (hours < 4) return 2;
  if (hours < 6) return 3;
  if (hours < 8) return 4;
  return 5;
}

// ─── Inline Heatmap ──────────────────────────────────────────

export function renderHeatmap(): void {
  const container = document.getElementById('heatmapGrid');
  if (!container) return;

  container.innerHTML = '';

  let totalStudyDays = 0;
  let totalHours = 0;
  let bestDay = { day: 0, hours: 0 };

  appState.trackerData.forEach((dayData) => {
    const totalDayHours = dayData.pythonHours + dayData.dsaHours + dayData.projectHours + dayData.col4Hours;
    const level = getHeatmapLevel(totalDayHours);

    if (totalDayHours > 0) {
      totalStudyDays++;
      totalHours += totalDayHours;
      if (totalDayHours > bestDay.hours) {
        bestDay = { day: dayData.day, hours: totalDayHours };
      }
    }

    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.setAttribute('data-level', String(level));
    cell.setAttribute('title', `Day ${dayData.day}: ${totalDayHours.toFixed(1)} hours`);
    container.appendChild(cell);
  });

  const avgHours = totalStudyDays > 0 ? (totalHours / totalStudyDays).toFixed(1) : '0';
  setTxt('heatmapStudyDays', totalStudyDays);
  setTxt('heatmapAvgHours', avgHours);
  setTxt('heatmapBestDay', bestDay.hours > 0 ? `Day ${bestDay.day} (${bestDay.hours.toFixed(1)}h)` : '-');
}

// ─── Modal Heatmap ───────────────────────────────────────────

export function renderHeatmapModal(): void {
  const container = document.getElementById('heatmapModalGrid');
  if (!container) return;

  container.innerHTML = '';

  appState.trackerData.forEach((dayData) => {
    const totalDayHours = dayData.pythonHours + dayData.dsaHours + dayData.projectHours + dayData.col4Hours;
    const level = getHeatmapLevel(totalDayHours);
    const date = new Date(dayData.date);

    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.setAttribute('data-level', String(level));
    cell.setAttribute('title', `Day ${dayData.day} (${formatDate(date)}): ${totalDayHours.toFixed(1)} hours`);
    container.appendChild(cell);
  });
}


