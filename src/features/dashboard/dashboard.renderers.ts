import { appState, getColumnsForDay } from '@/state/app-state';
import { CATEGORY_COLORS } from '@/config/constants';
import { formatDuration, formatDate, getLocalIsoDate } from '@/utils/date.utils';
import { getRecentVelocity } from '@/utils/calc.utils';

/** Security: Prevents XSS by sanitizing user-provided strings */
function sanitize(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getCategoryColor(name: string, targetRange?: any): { color: string, accent: string } {
  const accentClasses = [
    'accent-teal', 'accent-blue', 'accent-purple', 'accent-gold', 'accent-red', 
    'accent-cyan', 'accent-pink', 'accent-purple', 'accent-orange', 'accent-lime',
    'accent-fuchsia', 'accent-indigo'
  ];

  // 1. If we are in a specific phase, colors are based on the phase's column index
  if (targetRange && targetRange.columns) {
    const idx = targetRange.columns.findIndex((c: any) => c.name === name);
    if (idx >= 0) {
      return { 
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], 
        accent: accentClasses[idx % accentClasses.length] 
      };
    }
  }

  // 2. Fallback to Global Settings index
  const globalIdx = appState.settings.columns.findIndex(c => c.name === name);
  if (globalIdx >= 0) {
    return { 
      color: CATEGORY_COLORS[globalIdx % CATEGORY_COLORS.length], 
      accent: accentClasses[globalIdx % accentClasses.length] 
    };
  }

  // 3. Final fallback: Use a deterministic color based on the name hash
  // Use a more robust prime-based salt to prevent collisions
  let hash = 0x811c9dc5; 
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const deterministicIdx = Math.abs(hash);
  
  return { 
    color: CATEGORY_COLORS[deterministicIdx % CATEGORY_COLORS.length], 
    accent: accentClasses[deterministicIdx % accentClasses.length] 
  };
}

/** 
 * Analyzes mission status and applies glowing auras to core KPI cards.
 */
export function applyKPIMissionAuras(completionRate: number, streak: number, day: number): void {
  const cards = {
    sustainability: document.getElementById('sustainabilityLabel')?.closest('.card'),
    totalHours: document.getElementById('totalHours')?.closest('.card'),
    currentStreak: document.getElementById('currentStreak')?.closest('.card'),
    completionPercent: document.getElementById('completionPercent')?.closest('.card'),
    studyRank: document.getElementById('studyRank')?.closest('.card'),
  };

  // 1. Completion Aura
  if (cards.completionPercent) {
    cards.completionPercent.classList.remove('aura-optimal', 'aura-caution', 'aura-critical', 'aura-elite');
    if (completionRate >= 90) cards.completionPercent.classList.add('aura-elite');
    else if (completionRate >= 60) cards.completionPercent.classList.add('aura-optimal');
    else if (completionRate < 30) cards.completionPercent.classList.add('aura-caution');
  }

  // 1b. Sustainability Aura
  if (cards.sustainability) {
    cards.sustainability.classList.remove('aura-optimal', 'aura-caution', 'aura-critical', 'aura-elite', 'aura-focus');
    const label = document.getElementById('sustainabilityLabel')?.textContent?.toUpperCase() || '';
    if (label.includes('OPTIMAL')) cards.sustainability.classList.add('aura-optimal');
    else if (label.includes('EQUILIBRIUM')) cards.sustainability.classList.add('aura-elite');
    else if (['CAUTION', 'VOLATILE', 'DECAYING', 'DEBTED'].some(l => label.includes(l))) cards.sustainability.classList.add('aura-caution');
    else if (label.includes('CRITICAL')) cards.sustainability.classList.add('aura-critical');
    else cards.sustainability.classList.add('aura-focus');
  }

  // 2. Streak Aura
  if (cards.currentStreak) {
    cards.currentStreak.classList.remove('aura-optimal', 'aura-caution', 'aura-critical', 'aura-elite');
    if (streak >= 14) cards.currentStreak.classList.add('aura-elite');
    else if (streak >= 7) cards.currentStreak.classList.add('aura-optimal');
    else if (streak === 0) cards.currentStreak.classList.add('aura-critical');
  }

  // 3. Rank Aura (Based on Title)
  if (cards.studyRank) {
    cards.studyRank.classList.remove('aura-optimal', 'aura-caution', 'aura-critical', 'aura-elite');
    const title = cards.studyRank.textContent || '';
    if (['ELITE', 'LEGEND', 'SINGULARITY'].some(t => title.includes(t))) cards.studyRank.classList.add('aura-elite');
    else if (['PILOT', 'COMMANDER'].some(t => title.includes(t))) cards.studyRank.classList.add('aura-optimal');
  }
}

/**
 * High-fidelity parallax tilt engine.
 */
export function initInteractiveParallax(): void {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    (card as HTMLElement).addEventListener('mousemove', (e: MouseEvent) => {
      const rect = (card as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate rotation (max 10 degrees)
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      (card as HTMLElement).style.setProperty('--tilt-x', `${rotateX}deg`);
      (card as HTMLElement).style.setProperty('--tilt-y', `${rotateY}deg`);
    });

    (card as HTMLElement).addEventListener('mouseleave', () => {
      (card as HTMLElement).style.setProperty('--tilt-x', `0deg`);
      (card as HTMLElement).style.setProperty('--tilt-y', `0deg`);
    });
  });
}

export function renderSectorTokens(today: any): void {
  const container = document.getElementById('categoryCards');
  const filterEl = document.getElementById('phaseFilter') as HTMLSelectElement;
  if (!container) return;

  const filterValue = filterEl ? filterEl.value : 'current';
  
  // Dynamic Phase Sync: Aggregate by category NAME, not INDEX
  const categoryTotals = new Map<string, number>();
  let totalProblems = 0;
  let relevantData = appState.trackerData;
  let displayCols: any[] = [];
  let dayCount = Math.max(1, today.day);
  let targetRange: any = null;

  // 1. Identify which Phase we are analyzing
  const activePhaseIndex = appState.settings.customRanges.findIndex(r => {
    const todayStr = getLocalIsoDate();
    return todayStr >= r.startDate && todayStr <= r.endDate;
  });

  if (filterValue === 'overall') {
    // Show stats for every category ever tracked across the whole timeline
    relevantData.forEach(d => {
      const dayCols = getColumnsForDay(d.day);
      if (Array.isArray(d.studyHours)) {
        d.studyHours.forEach((v, i) => {
          const colName = dayCols[i]?.name;
          if (colName && (v || 0) > 0) {
            categoryTotals.set(colName, (categoryTotals.get(colName) || 0) + (v || 0));
          }
        });
      }
      totalProblems += (d.problemsSolved || 0);
    });

    // Dynamically build cards for EVERYTHING found in history
    const settingsNames = new Set((appState.settings.columns || []).map(c => c.name));
    displayCols = [...(appState.settings.columns || [])];
    
    // Add legacy categories that have hours but aren't in current settings
    Array.from(categoryTotals.keys()).forEach(name => {
      if (!settingsNames.has(name)) {
        displayCols.push({ name, target: 0 });
      }
    });
  } else {
    // Current Phase or Specific Phase Index
    if (filterValue === 'current') {
      targetRange = activePhaseIndex >= 0 ? appState.settings.customRanges[activePhaseIndex] : null;
    } else {
      const idx = parseInt(filterValue);
      targetRange = appState.settings.customRanges[idx];
    }

    if (targetRange) {
      const todayStr = getLocalIsoDate();
      relevantData = appState.trackerData.filter(d => {
        const dStr = d.date.split('T')[0];
        return dStr >= targetRange.startDate && dStr <= targetRange.endDate;
      });
      displayCols = targetRange.columns || [];
      
      // Calculate active days elapsed specifically within this phase for accurate ETA
      const elapsedInPhase = relevantData.filter(d => d.date.split('T')[0] <= todayStr).length;
      dayCount = Math.max(1, elapsedInPhase);
    } else {
      // Fallback if no phase found
      displayCols = getColumnsForDay(today.day);
    }

    relevantData.forEach(d => {
      const dayCols = getColumnsForDay(d.day);
      if (Array.isArray(d.studyHours)) {
        d.studyHours.forEach((v, i) => {
          const colName = dayCols[i]?.name;
          if (colName && (v || 0) > 0) {
            categoryTotals.set(colName, (categoryTotals.get(colName) || 0) + (v || 0));
          }
        });
      }
      totalProblems += (d.problemsSolved || 0);
    });
  }

  const estimateTargetDate = (total: number, target: number): string => {
    if (target <= 0) return '-';
    if (total >= target) return 'Done';
    if (total <= 0) return 'Awaiting Data';
    
    const dailyPace = total / dayCount;
    if (dailyPace <= 0 || !isFinite(dailyPace)) return 'Awaiting Data';
    
    const left = target - total;
    const etaDays = Math.ceil(left / dailyPace);
    
    // Safety check for impossible ETAs
    if (etaDays > 10000 || etaDays < 0) return 'Awaiting Data';

    const d = new Date();
    d.setDate(d.getDate() + etaDays);
    return formatDate(d);
  };

  const accentClasses = [
    'accent-teal', 'accent-blue', 'accent-purple', 'accent-gold', 'accent-red', 
    'accent-cyan', 'accent-pink', 'accent-purple', 'accent-orange', 'accent-lime',
    'accent-fuchsia', 'accent-indigo'
  ];

  const studyCats = displayCols.map((col) => {
    const total = categoryTotals.get(col.name) || 0;
    const target = col.target || 0;
    const { color, accent } = getCategoryColor(col.name, targetRange);
    return {
      label: col.name,
      value: total,
      target: target,
      accent: accent,
      hexColor: color,
      detail: `${formatDuration(total) || '0h'} / ${formatDuration(target) || '0h'}`,
      finish: estimateTargetDate(total, target),
    };
  });

  const categories = [
    ...studyCats,
    {
      label: 'Problems Solved',
      value: totalProblems,
      target: 0,
      accent: 'accent-red',
      hexColor: '#f87171',
      detail: 'total solved',
      finish: '-',
    },
  ];

  container.innerHTML = categories.map(cat => `
    <div class="zen-card metric-item category-progress-card ${cat.accent}" style="flex: 1; border-bottom: 2px solid ${cat.hexColor}">
      <span class="label-caps">${sanitize(cat.label)}</span>
      <div class="metric-value">${cat.label === 'Problems Solved' ? (typeof cat.value === 'number' ? cat.value.toFixed(0) : cat.value) : formatDuration(cat.value as number) || '0h'}</div>
      <div class="category-progress-track-wrap">
        <div class="category-progress-track">
          <div class="category-progress-fillline" style="width:${cat.target > 0 ? Math.min(100, Math.round((cat.value / cat.target) * 100)) : Math.min(100, cat.value > 0 ? 100 : 0)}%; background: ${cat.hexColor}"></div>
        </div>
      </div>
      <div class="category-progress-meta">${sanitize(cat.detail)}</div>
      <div class="category-progress-eta">${cat.finish !== '-' ? `Finish: ${sanitize(cat.finish)}` : ' '}</div>
    </div>
  `).join('');
}

export function renderVelocitySparkline(trackerData: any[]): void {
  const canvas = document.getElementById('velocitySparkline') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const velocity = getRecentVelocity(trackerData, 14);

  const width = canvas.width;
  const height = canvas.height;
  const max = Math.max(...velocity, 1);

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  velocity.forEach((v: number, i: number) => {
    const x = (i / (velocity.length - 1)) * width;
    const y = height - (v / max) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(96, 165, 250, 0.2)');
  grad.addColorStop(1, 'rgba(96, 165, 250, 0)');
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fillStyle = grad;
  ctx.fill();
}

export function renderAllocationBar(): void {
  const bar = document.getElementById('allocationBar');
  const filterEl = document.getElementById('phaseFilter') as HTMLSelectElement;
  const titleEl = document.querySelector('.sub-heading-tactical');
  if (!bar) return;

  const filterValue = filterEl ? filterEl.value : 'current';
  const categoryMap = new Map<string, number>();
  let relevantData = appState.trackerData;

  // 1. Identify Target Range
  let targetRange: any = null;
  if (filterValue !== 'overall') {
    const todayStr = getLocalIsoDate();
    const activeIdx = appState.settings.customRanges.findIndex(r => todayStr >= r.startDate && todayStr <= r.endDate);
    if (filterValue === 'current') {
      targetRange = activeIdx >= 0 ? appState.settings.customRanges[activeIdx] : null;
    } else {
      targetRange = appState.settings.customRanges[parseInt(filterValue)];
    }
  }

  if (targetRange) {
    relevantData = appState.trackerData.filter(d => {
      const dStr = d.date.split('T')[0];
      return dStr >= targetRange.startDate && dStr <= targetRange.endDate;
    });
    if (titleEl) titleEl.textContent = `${(targetRange.name || 'Phase').toUpperCase()} ALLOCATION`;
  } else {
    if (titleEl) titleEl.textContent = 'OVERALL ALLOCATION';
  }

  relevantData.forEach(d => {
    const dayCols = getColumnsForDay(d.day);
    if (Array.isArray(d.studyHours)) {
      d.studyHours.forEach((v, i) => {
        const colName = dayCols[i]?.name;
        if (colName && (v || 0) > 0) {
          categoryMap.set(colName, (categoryMap.get(colName) || 0) + (v || 0));
        }
      });
    }
  });

  // Generate segments based on categories FOUND in the data for this selection
  const segments = Array.from(categoryMap.entries())
    .map(([name, value]) => {
      const { color, accent } = getCategoryColor(name, targetRange);
      return { name, value, color, accent };
    })
    .filter(s => s.value > 0);

  const completedDays = relevantData.filter(d => d.completed).length;
  const totalDays = relevantData.length || 1;
  const missionPct = Math.round((completedDays / totalDays) * 100);
  
  const totalDisplay = document.getElementById('allocationTotal');
  if (totalDisplay) totalDisplay.textContent = `${missionPct}%`;

  if (segments.length === 0) {
    bar.innerHTML = `<div class="allocation-segment" style="width:100%; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #64748b;">No Data For This Selection</div>`;
    const legend = document.getElementById('allocationLegend');
    if (legend) legend.innerHTML = '';
    return;
  }

  const allTimeTotal = segments.reduce((s: number, x: { value: number }) => s + x.value, 0);

  bar.innerHTML = segments
    .map((s: { name: string; value: number; color: string }) => {
      const pct = allTimeTotal > 0 ? ((s.value / allTimeTotal) * 100).toFixed(1) : '0';
      return `
        <div class="allocation-segment" 
             style="width:${pct}%; background:${s.color};" 
             title="${s.name}: ${formatDuration(s.value)} (${pct}%)">
          <div class="segment-shine"></div>
        </div>`;
    })
    .join('');

  const legend = document.getElementById('allocationLegend');
  if (legend) {
    legend.innerHTML = segments
      .map((s: { name: string; value: number; color: string }) => {
        const pct = allTimeTotal > 0 ? Math.round((s.value / allTimeTotal) * 100) : 0;
        return `
          <div class="legend-pill" style="--accent: ${s.color}">
            <span class="legend-dot" style="background:${s.color}"></span>
            <span class="legend-label">${sanitize(s.name)}</span>
            <span class="legend-value">${formatDuration(s.value)}</span>
            <span class="legend-pct-pill">${pct}%</span>
          </div>
        `;
      })
      .join('');
  }
}
