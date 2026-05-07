import { appState, getColumnsForDay } from '@/state/app-state';
import { CATEGORY_COLORS } from '@/config/constants';
import { formatDuration, formatDate } from '@/utils/date.utils';
import { getRecentVelocity } from '@/utils/calc.utils';

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
  if (!container) return;

  // 🛰️ DYNAMIC PHASE SYNC: Aggregate by category NAME, not INDEX
  const categoryTotals = new Map<string, number>();
  let totalProblems = 0;

  appState.trackerData.forEach(d => {
    // Get the column names for THIS specific day
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

  // For the UI, we show the columns active TODAY
  const todayCols = getColumnsForDay(today.day);
  const daysElapsed = Math.max(1, today.day);

  const estimateTargetDate = (total: number, target: number): string => {
    if (target <= 0) return '-';
    if (total >= target) return 'Done';
    if (total <= 0) return '-';
    const dailyPace = total / daysElapsed;
    if (dailyPace <= 0) return '-';
    const left = target - total;
    const etaDays = Math.ceil(left / dailyPace);
    const d = new Date();
    d.setDate(d.getDate() + etaDays);
    return formatDate(d);
  };

  const accentClasses = [
    'accent-teal', 'accent-blue', 'accent-purple', 'accent-gold', 'accent-red', 
    'accent-cyan', 'accent-pink', 'accent-emerald', 'accent-orange', 'accent-lime',
    'accent-fuchsia', 'accent-indigo'
  ];

  const studyCats = todayCols.map((col, i) => {
    const total = categoryTotals.get(col.name) || 0;
    const target = col.target || 0;
    return {
      label: col.name,
      value: total,
      target: target,
      accent: accentClasses[i % accentClasses.length],
      hexColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
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
      <span class="label-caps">${cat.label}</span>
      <div class="metric-value">${cat.label === 'Problems Solved' ? (typeof cat.value === 'number' ? cat.value.toFixed(0) : cat.value) : formatDuration(cat.value as number) || '0h'}</div>
      <div class="category-progress-track-wrap">
        <div class="category-progress-track">
          <div class="category-progress-fillline" style="width:${cat.target > 0 ? Math.min(100, Math.round((cat.value / cat.target) * 100)) : Math.min(100, cat.value > 0 ? 100 : 0)}%; background: ${cat.hexColor}"></div>
        </div>
      </div>
      <div class="category-progress-meta">${cat.detail}</div>
      <div class="category-progress-eta">${cat.finish !== '-' ? `Finish: ${cat.finish}` : ' '}</div>
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
  if (!bar) return;

  const categoryMap = new Map<string, number>();

  appState.trackerData.forEach(d => {
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

  let segments = Array.from(categoryMap.entries())
    .map(([name, value], i) => ({ 
      name, 
      value, 
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] 
    }))
    .filter(s => s.value > 0);

  const completedDays = appState.trackerData.filter(d => d.completed).length;
  const totalDays = appState.totalDays || 1;
  const missionPct = Math.round((completedDays / totalDays) * 100);
  
  const totalDisplay = document.getElementById('allocationTotal');
  if (totalDisplay) totalDisplay.textContent = `${missionPct}%`;

  if (segments.length === 0) {
    bar.innerHTML = `<div class="allocation-segment" style="width:${missionPct}%;background:linear-gradient(90deg,#6a8fff,#8b5cf6)" title="Overall: ${missionPct}% complete"></div>`;
    const legend = document.getElementById('allocationLegend');
    if (legend) legend.innerHTML = `
      <div class="legend-pill" style="--accent: #6a8fff">
        <span class="legend-dot" style="background:#6a8fff"></span>
        <span class="legend-label">Overall Completion</span>
        <span class="legend-value">${missionPct}%</span>
      </div>`;
    return;
  }

  const allTimeTotal = segments.reduce((s: number, x: { value: number }) => s + x.value, 0);

  if (segments.length > 6) {
    segments.sort((a: { value: number }, b: { value: number }) => b.value - a.value);
    const top = segments.slice(0, 6);
    const rest = segments.slice(6);
    const otherVal = rest.reduce((s: number, x: { value: number }) => s + x.value, 0);
    if (otherVal > 0) top.push({ name: 'Other', value: otherVal, color: '#334155' });
    segments = top;
  }

  bar.innerHTML = segments
    .map((s: { name: string; value: number; color: string }) => {
      const pct = ((s.value / allTimeTotal) * 100).toFixed(1);
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
        const pct = Math.round((s.value / allTimeTotal) * 100);
        return `
          <div class="legend-pill" style="--accent: ${s.color}">
            <span class="legend-dot" style="background:${s.color}"></span>
            <span class="legend-label">${s.name}</span>
            <span class="legend-value">${formatDuration(s.value)}</span>
            <span class="legend-pct-pill">${pct}%</span>
          </div>
        `;
      })
      .join('');
  }
}
