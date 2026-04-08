/**
 * Handles the 'Frequency' (Heatmap) grid.
 * 
 * This draws the grid of squares that show how much you studied each day.
 */

import { appState } from '@/state/app-state';
import { formatDate } from '@/utils/date.utils';
import { setTxt } from '@/utils/dom.utils';

// --- Work out the color level ---

function getHeatmapLevel(hours: number): number {
  if (hours === 0) return 0;
  if (hours < 2) return 1;
  if (hours < 4) return 2;
  if (hours < 6) return 3;
  if (hours < 8) return 4;
  return 5;
}

// --- Draw the Grid ---

export function renderHeatmap(): void {
  const grid = document.getElementById('heatmapGrid');
  const labels = document.getElementById('heatmapMonths');
  if (!grid || !labels) return;
  renderAdvancedHeatmap(grid, labels, 'dashboard');
}

export function renderHeatmapModal(): void {
  const grid = document.getElementById('heatmapModalGrid');
  const labels = document.getElementById('heatmapModalMonths');
  if (!grid || !labels) return;
  renderAdvancedHeatmap(grid, labels, 'modal');
}

function localYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderMonthLabels(container: HTMLElement, year: number): void {
  container.innerHTML = '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // To align, we check which week each month starts in
  const startDate = new Date(year, 0, 1);
  const firstDayOffset = startDate.getDay(); // 0-6 spacers

  months.forEach((name, i) => {
    const monthFirst = new Date(year, i, 1);
    // Rough week calculation for alignment
    const dayOfYear = Math.floor((monthFirst.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor((dayOfYear + firstDayOffset) / 7);
    
    const span = document.createElement('span');
    span.className = 'month-label';
    span.innerText = name;
    // Align based on week column (12px cell + 3px gap)
    span.style.left = `${weekIndex * 15}px`; 
    container.appendChild(span);
  });
}

function renderAdvancedHeatmap(grid: HTMLElement, labels: HTMLElement, mode: 'dashboard' | 'modal' | 'none'): void {
  grid.innerHTML = '';
  if (appState.trackerData.length === 0) return;

  // 1. Map the data by date for quick access
  const dataMap = new Map<string, number>();
  let totalStudyDays = 0;
  let totalHours = 0;
  let bestDay = { day: 0, hours: 0, date: '' };

  const firstDateObj = new Date(appState.trackerData[0].date);
  const lastDateObj = new Date(appState.trackerData[appState.trackerData.length - 1].date);
  const firstRangeKey = localYMD(firstDateObj);
  const lastRangeKey = localYMD(lastDateObj);

  appState.trackerData.forEach((dayData) => {
    const totalDayHours = Array.isArray(dayData.studyHours) ? dayData.studyHours.reduce((s, n) => s + (n || 0), 0) : 0;
    const key = localYMD(new Date(dayData.date));
    dataMap.set(key, totalDayHours);

    if (totalDayHours > 0) {
      totalStudyDays++;
      totalHours += totalDayHours;
      if (totalDayHours > bestDay.hours) {
        bestDay = { day: dayData.day, hours: totalDayHours, date: dayData.date };
      }
    }
  });

  // 2. Identify Year and Range
  const yearSelect = document.getElementById('heatmapYearSelect') as HTMLSelectElement;
  let yearStart = firstDateObj.getFullYear();
  if (yearSelect && yearSelect.value) {
    yearStart = parseInt(yearSelect.value, 10);
  }

  renderMonthLabels(labels, yearStart);

  const startDate = new Date(yearStart, 0, 1);
  const endDate = new Date(yearStart, 11, 31);

  // 3. Build Full Year Grid
  // Add leading spacers for the first week to align Jan 1st with its day of week
  const firstDayOfWeek = startDate.getDay(); // 0=Sun, 1=Mon...
  for (let i = 0; i < firstDayOfWeek; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'heatmap-cell spacer';
    spacer.style.visibility = 'hidden';
    grid.appendChild(spacer);
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = localYMD(current);
    const hours = dataMap.get(dateKey) || 0;
    const level = getHeatmapLevel(hours);
    
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    
    // Improved out-of-range logic:
    // We only dim if the year matches a tracked year but the date is before/after the sprint.
    // If the year is completely untracked, we show it as a clean empty grid.
    const hasDataInThisYear = (firstDateObj.getFullYear() === yearStart || lastDateObj.getFullYear() === yearStart);
    const isOutOfRange = hasDataInThisYear && (dateKey < firstRangeKey || dateKey > lastRangeKey);

    if (isOutOfRange) cell.classList.add('out-of-range');
    
    cell.setAttribute('data-level', String(level));
    const title = isOutOfRange 
      ? `${formatDate(current)}: Outside active study range`
      : `${formatDate(current)}: ${hours.toFixed(1)} hours`;
    cell.setAttribute('title', title);
    
    grid.appendChild(cell);
    current.setDate(current.getDate() + 1);
  }

  // 4. Update Stats (only if updateStats is requested)
  if (mode !== 'none') {
    const avgHours = totalStudyDays > 0 ? (totalHours / totalStudyDays).toFixed(1) : '0';
    const prefix = mode === 'modal' ? 'heatmapModal' : 'heatmap';
    
    setTxt(`${prefix}StudyDays`, totalStudyDays);
    setTxt(`${prefix}AvgHours`, avgHours);
    
    const bestDayEl = document.getElementById(`${prefix}BestDay`);
    if (bestDayEl) {
      bestDayEl.innerText = bestDay.hours > 0 ? `${formatDate(new Date(bestDay.date))} (${bestDay.hours.toFixed(1)}h)` : '-';
    }
  }
}
