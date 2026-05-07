import { appState } from '@/state/app-state';
import { formatDate, getLocalIsoDate } from '@/utils/date.utils';
import { setTxt } from '@/utils/dom.utils';

// --- Intensity Levels ---

function getHeatmapLevel(hours: number): number {
  if (hours === 0) return 0;
  if (hours < 1) return 1;
  if (hours < 3) return 2;
  if (hours < 6) return 3;
  if (hours < 9) return 4;
  return 5;
}

// --- Interaction & Tooltips ---

function createTooltip(cell: HTMLElement, dateStr: string, hours: number, isOutOfRange: boolean): void {
  const title = isOutOfRange 
    ? `${dateStr}: Outside active study range`
    : `${dateStr}: ${hours.toFixed(1)} hours of focus`;
  cell.setAttribute('title', title);
}

// --- UI Entry Points ---

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

// --- Core Rendering Engine ---

function renderAdvancedHeatmap(grid: HTMLElement, labels: HTMLElement, mode: 'dashboard' | 'modal' | 'none'): void {
  grid.innerHTML = '';
  if (!appState.trackerData || appState.trackerData.length === 0) return;

  // 1. Determine Selected Year
  const yearSelect = document.getElementById('heatmapYearSelect') as HTMLSelectElement;
  let viewYear = new Date().getFullYear();
  if (yearSelect && yearSelect.value) {
    viewYear = parseInt(yearSelect.value, 10);
  }

  // 2. Pivot Data for Quick Access
  const dataMap = new Map<string, number>();
  appState.trackerData.forEach(d => {
    const total = Array.isArray(d.studyHours) ? d.studyHours.reduce((s, n) => s + (n || 0), 0) : 0;
    dataMap.set(d.date.split('T')[0], total);
  });

  // 3. Define the Global Sprint Bounds (for dimming out-of-range cells)
  const firstDataDate = appState.trackerData[0].date.split('T')[0];
  const lastDataDate = appState.trackerData[appState.trackerData.length - 1].date.split('T')[0];

  // 4. Year-Specific Statistics Accumulators
  let yearStudyDays = 0;
  let yearTotalHours = 0;
  let yearBestDay = { hours: 0, date: '' };

  // 5. Month Label Alignment
  renderMonthLabels(labels, viewYear);

  // 6. Build the Grid (GitHub-style Column-First layout)
  const startDate = new Date(viewYear, 0, 1);
  const endDate = new Date(viewYear, 11, 31);

  // Pre-fill spacers for the first week
  const firstDayOfWeek = startDate.getDay(); // 0=Sun, 1=Mon...
  for (let i = 0; i < firstDayOfWeek; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'heatmap-cell spacer';
    spacer.style.visibility = 'hidden';
    grid.appendChild(spacer);
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = getLocalIsoDate(current);
    const hours = dataMap.get(dateKey) || 0;
    const level = getHeatmapLevel(hours);
    
    // Accumulate year-specific stats
    if (hours > 0) {
      yearStudyDays++;
      yearTotalHours += hours;
      if (hours > yearBestDay.hours) {
        yearBestDay = { hours, date: dateKey };
      }
    }

    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.setAttribute('data-level', String(level));
    
    // Range Detection
    const isOutOfRange = dateKey < firstDataDate || dateKey > lastDataDate;
    if (isOutOfRange) cell.classList.add('out-of-range');
    
    createTooltip(cell, formatDate(current), hours, isOutOfRange);
    grid.appendChild(cell);

    current.setDate(current.getDate() + 1);
  }

  // 7. Update Statistics Footer (Year-Pivot Mode)
  if (mode !== 'none') {
    const avgHours = yearStudyDays > 0 ? (yearTotalHours / yearStudyDays).toFixed(1) : '0';
    const prefix = mode === 'modal' ? 'heatmapModal' : 'heatmap';
    
    setTxt(`${prefix}StudyDays`, yearStudyDays);
    setTxt(`${prefix}AvgHours`, avgHours);
    
    const bestDayEl = document.getElementById(`${prefix}BestDay`);
    if (bestDayEl) {
      bestDayEl.innerText = yearBestDay.hours > 0 ? `${formatDate(new Date(yearBestDay.date))} (${yearBestDay.hours.toFixed(1)}h)` : '-';
    }
  }
}

function renderMonthLabels(container: HTMLElement, year: number): void {
  container.innerHTML = '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startDate = new Date(year, 0, 1);
  const firstDayOffset = startDate.getDay();

  months.forEach((name, i) => {
    const monthFirst = new Date(year, i, 1);
    const dayOfYear = Math.floor((monthFirst.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor((dayOfYear + firstDayOffset) / 7);
    
    const span = document.createElement('span');
    span.className = 'month-label';
    span.innerText = name;
    // Align based on CSS column width (12px cell + 3px gap)
    span.style.left = `${weekIndex * 15}px`; 
    container.appendChild(span);
  });
}
