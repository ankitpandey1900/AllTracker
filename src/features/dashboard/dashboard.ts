/**
 * Dashboard feature
 *
 * Computes and renders all dashboard statistics:
 *  - Current day, total hours, streak, completion rate
 *  - Rank system (Iron → Eternal)
 *  - Category allocation bar
 *  - Daily target progress cards
 */

import { appState, getAllHourColumnLabels, getColumnNames } from '@/state/app-state';
import { RANK_TIERS, TIER_TITLES } from '@/config/constants';
import { setTxt } from '@/utils/dom.utils';
import { formatDate } from '@/utils/date.utils';
import type { RankDetails } from '@/types/tracker.types';
import { renderStudyAnalytics } from './study-analytics';

// ─── XP & Level System ───────────────────────────────────────

function calculateXP(totalHours: number): { xp: number; level: number; nextLevelXP: number; progress: number } {
  const xp = Math.round(totalHours * 100);
  const level = Math.floor(xp / 1000);
  const xpInLevel = xp % 1000;
  const progress = (xpInLevel / 1000) * 100;
  return { xp, level, nextLevelXP: 1000 - xpInLevel, progress };
}

// ─── Focus HUD Management ────────────────────────────────────

export function toggleFocusHUD(show: boolean, subject: string = '', time: string = ''): void {
  const hud = document.getElementById('focusHud');
  const subjEl = document.getElementById('timerSubject');
  const timeEl = document.getElementById('timerDisplay');

  if (!hud) return;

  if (show) {
    if (subjEl) subjEl.textContent = subject.toUpperCase();
    if (timeEl) timeEl.textContent = time;
    hud.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    hud.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ─── Rank Calculation ────────────────────────────────────────

function getRank(totalHours: number): RankDetails {
  for (let i = 0; i < RANK_TIERS.length; i++) {
    const tier = RANK_TIERS[i];
    if (totalHours >= tier.min && totalHours < tier.max) {
      const tierRange = tier.max - tier.min;
      const tierProgress = totalHours - tier.min;
      const divisionSize = tierRange / 5;
      const divIndex = Math.min(4, Math.floor(tierProgress / divisionSize));
      const divNames = ['V', 'IV', 'III', 'II', 'I'];
      const division = divNames[divIndex];

      const titles = TIER_TITLES[tier.name] || ['Unknown'];
      const title = titles[divIndex] || titles[0];
      const worldPos = `Top ${Math.max(1, Math.round(100 - (totalHours / 50) * 10))}%`;
      const tierXP = Math.round((tierProgress / tierRange) * 100);
      const level = i * 5 + divIndex + 1;

      return {
        name: tier.name,
        min: tier.min,
        max: tier.max,
        color: tier.color,
        division,
        title,
        worldPos,
        tierXP,
        level,
      };
    }
  }

  // Fallback for max hours
  const last = RANK_TIERS[RANK_TIERS.length - 1];
  return {
    name: last.name,
    min: last.min,
    max: last.max,
    color: last.color,
    division: 'I',
    title: TIER_TITLES[last.name]?.[4] || 'LIMITLESS',
    worldPos: 'Top 0.01%',
    tierXP: 100,
    level: 50,
  };
}

// ─── Streak Calculation ──────────────────────────────────────

function calculateStreak(): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = appState.trackerData.length - 1; i >= 0; i--) {
    if (appState.trackerData[i].completed) {
      streak++;
    } else {
      const dayDate = new Date(appState.trackerData[i].date);
      dayDate.setHours(0, 0, 0, 0);
      if (dayDate >= today) continue;
      break;
    }
  }
  return streak;
}

// ─── Today Detection ─────────────────────────────────────────

function findTodayIndex(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < appState.trackerData.length; i++) {
    const d = new Date(appState.trackerData[i].date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return i;
  }
  return -1;
}

// ─── Main Dashboard Update ───────────────────────────────────

export function updateDashboard(): void {
  const data = appState.trackerData;
  if (!data || data.length === 0) return;

  const todayIndex = findTodayIndex();
  const today = todayIndex >= 0 ? data[todayIndex] : data[data.length - 1];
  // Assuming calculateStats and calculateLevel are defined elsewhere or will be added.
  // For now, using placeholder values or existing functions if they match.
  // Re-implementing based on original logic for now, as calculateStats/calculateLevel are not provided.
  let totalHours = 0;
  let completedDays = 0;
  for (const day of data) {
    totalHours += day.pythonHours + day.dsaHours + day.projectHours + day.col4Hours + (Array.isArray(day.extraHours) ? day.extraHours.reduce((s, n) => s + (n || 0), 0) : 0);
    if (day.completed) completedDays++;
  }
  const streak = calculateStreak();
  const completionRate = completedDays > 0 ? (completedDays / appState.totalDays) * 100 : 0;
  const studyDays = data.filter((d) => (d.pythonHours + d.dsaHours + d.projectHours + d.col4Hours + (Array.isArray(d.extraHours) ? d.extraHours.reduce((s, n) => s + (n || 0), 0) : 0)) > 0).length;
  const avgHoursPerStudyDay = studyDays > 0 ? totalHours / studyDays : 0;

  const xpData = calculateXP(totalHours);
  const rankData = getRank(totalHours);

  // Update Eternity Header
  const xpFill = document.getElementById('xpFill');
  if (xpFill) xpFill.style.width = `${xpData.progress}%`;

  const levelBadge = document.getElementById('levelBadge');
  if (levelBadge) levelBadge.textContent = `LVL ${xpData.level}`;

  // Update Bento Cards
  setTxt('currentDay', `DAY ${today.day}`);
  setTxt('heroDayMirror', today.day);
  setTxt('totalHours', `${totalHours.toFixed(1)}h`);
  setTxt('currentStreak', `${streak} DAYS`);
  setTxt('completionPercent', `${Math.round(completionRate)}%`);
  setTxt('completionPercentMirror', `${Math.round(completionRate)}%`);
  setTxt('avgHoursPerDay', avgHoursPerStudyDay.toFixed(1));

  setTxt('studyRank', rankData.name.toUpperCase());
  setTxt('rankTierText', rankData.division);
  setTxt('consistencyStat', `${Math.round(completionRate)}%`);
  setTxt('bestStreakStat', streak);
  setTxt('startDateLabel', `Start: ${formatDate(appState.startDate)}`);

  const estimatedFinish = calculateEstimatedFinishDate(today.day, completedDays);
  setTxt('estimatedFinishDate', estimatedFinish);
  const rankXPBar = document.getElementById('rankXPBar');
  if (rankXPBar) rankXPBar.style.width = `${rankData.tierXP}%`;

  // Render Sector Tokens (Category Cards)
  renderSectorTokens(today);
  
  renderAllocationBar(today, totalHours);
  renderProjectSummary(todayIndex >= 0 ? todayIndex : data.length - 1);
  renderStudyAnalytics();
  
  // Dynamic Hero Status
  const statusEl = document.getElementById('heroStatusTitle');
  if (statusEl) {
    statusEl.textContent = getDynamicStatusMessage(today.day, completedDays);
  }
}

function getDynamicStatusMessage(currentDay: number, completedDays: number): string {
  const totalDays = appState.totalDays || 365;
  const expectedPace = currentDay / totalDays;
  const actualPace = completedDays / totalDays;
  const diff = actualPace - expectedPace;

  const taunts = [
    "The clock is ticking. Get moving!",
    "You're slipping behind. Pick up the pace!",
    "Another day wasted? Do it fast!",
    "Laziness is the enemy. Start now.",
    "Is this your best? Prove it.",
    "Your future self is disappointed. Fix it."
  ];

  const steady = [
    "Staying consistent. Keep going.",
    "Steady progress. Don't stop.",
    "On track. Maintain the discipline.",
    "The grind continues. Stay focused."
  ];

  const appreciation = [
    "Crushing it! Keep this energy.",
    "Eternity awaits. You're ahead of schedule.",
    "Legend in the making. Exceptional work!",
    "Pure focus. Most people can't do this.",
    "Ahead of the game. Keep leading.",
    "God tier discipline. Unstoppable!"
  ];

  if (diff < -0.05) return taunts[Math.floor(Math.random() * taunts.length)];
  if (diff > 0.10) return appreciation[Math.floor(Math.random() * appreciation.length)];
  if (diff > 0) return appreciation[Math.floor(Math.random() * 3)]; // Lower tier appreciation
  return steady[Math.floor(Math.random() * steady.length)];
}

function calculateEstimatedFinishDate(currentDayNumber: number, completedDays: number): string {
  if (currentDayNumber <= 0 || completedDays <= 0) return '-';
  const pace = completedDays / currentDayNumber;
  if (pace <= 0) return '-';
  const remainingCompletions = Math.max(0, appState.totalDays - completedDays);
  if (remainingCompletions === 0) return 'Done';
  const daysNeeded = Math.ceil(remainingCompletions / pace);
  const eta = new Date();
  eta.setDate(eta.getDate() + daysNeeded);
  return formatDate(eta);
}

function renderProjectSummary(todayIndex: number): void {
  const data = appState.trackerData;
  if (!data.length) return;

  const safeIdx = Math.max(0, Math.min(todayIndex, data.length - 1));
  const today = data[safeIdx];
  const start = Math.max(0, safeIdx - 6);
  const last7 = data.slice(start, safeIdx + 1);

  const weeklyProjectHours = last7.reduce((sum, d) => sum + d.projectHours, 0);
  const weeklyProblems = last7.reduce((sum, d) => sum + d.dsaProblems, 0);

  setTxt('todayProjectTitle', today.project?.trim() || 'No project logged');
  setTxt('todayTopicsSummary', today.topics?.trim() || 'Add your work details in Topics and Project fields.');
  setTxt('weekProjectHours', `${weeklyProjectHours.toFixed(1)}h`);
  setTxt('weekProblemCount', weeklyProblems);
}

function renderSectorTokens(today: any): void { // Changed type to 'any' as TrackerDay is not defined here
  const container = document.getElementById('categoryCards');
  if (!container) return;

  const labels = getAllHourColumnLabels(today.day);
  const totals = appState.trackerData.reduce(
    (acc, d) => {
      acc.col1 += d.pythonHours;
      acc.col2 += d.dsaHours;
      acc.col3 += d.projectHours;
      acc.col4 += d.col4Hours;
      if (Array.isArray(d.extraHours)) {
        d.extraHours.forEach((v, i) => {
          acc.extras[i] = (acc.extras[i] || 0) + (v || 0);
        });
      }
      acc.problems += d.dsaProblems;
      return acc;
    },
    { col1: 0, col2: 0, col3: 0, col4: 0, extras: [] as number[], problems: 0 },
  );
  const targets = appState.settings.targets || {};
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

  const accentCycle = ['accent-teal', 'accent-blue', 'accent-purple', 'accent-gold', 'accent-red'];
  const baseCats = [
    {
      label: labels[0] || 'Col 1',
      value: totals.col1,
      target: targets.col1 || 0,
      accent: accentCycle[0],
      detail: `${totals.col1.toFixed(1)} / ${(targets.col1 || 0).toFixed(0)} hrs`,
      finish: estimateTargetDate(totals.col1, targets.col1 || 0),
    },
    {
      label: labels[1] || 'Col 2',
      value: totals.col2,
      target: targets.col2 || 0,
      accent: accentCycle[1],
      detail: `${totals.col2.toFixed(1)} / ${(targets.col2 || 0).toFixed(0)} hrs`,
      finish: estimateTargetDate(totals.col2, targets.col2 || 0),
    },
    {
      label: labels[2] || 'Col 3',
      value: totals.col3,
      target: targets.col3 || 0,
      accent: accentCycle[2],
      detail: `${totals.col3.toFixed(1)} / ${(targets.col3 || 0).toFixed(0)} hrs`,
      finish: estimateTargetDate(totals.col3, targets.col3 || 0),
    },
    {
      label: labels[3] || 'Col 4',
      value: totals.col4,
      target: targets.col4 || 0,
      accent: accentCycle[3],
      detail: `${totals.col4.toFixed(1)} / ${(targets.col4 || 0).toFixed(0)} hrs`,
      finish: estimateTargetDate(totals.col4, targets.col4 || 0),
    },
  ];

  const extraTargets = (appState.settings.extraColumns || []).map((c) => c.target || 0);
  const extraCats = totals.extras.map((v, i) => {
    const t = extraTargets[i] || 0;
    const label = labels[i + 4] || `Extra ${i + 1}`;
    return {
      label,
      value: v,
      target: t,
      accent: accentCycle[(i + 4) % accentCycle.length],
      detail: `${v.toFixed(1)} / ${t.toFixed(0)} hrs`,
      finish: estimateTargetDate(v, t),
    };
  });

  const categories = [
    ...baseCats,
    ...extraCats,
    {
      label: 'DSA Problems',
      value: totals.problems,
      target: 0,
      accent: 'accent-red',
      detail: 'total solved',
      finish: '-',
    },
  ];

  container.innerHTML = categories.map(cat => `
    <div class="zen-card metric-item category-progress-card ${cat.accent}" style="flex: 1;">
      <span class="label-caps">${cat.label}</span>
      <div class="metric-value">${typeof cat.value === 'number' ? cat.value.toFixed(cat.label === 'DSA Problems' ? 0 : 1) : cat.value}</div>
      <div class="category-progress-track-wrap">
        <div class="category-progress-track">
          <div class="category-progress-fillline" style="width:${cat.target > 0 ? Math.min(100, Math.round((cat.value / cat.target) * 100)) : Math.min(100, cat.value > 0 ? 100 : 0)}%"></div>
        </div>
      </div>
      <div class="category-progress-meta">${cat.detail}</div>
      <div class="category-progress-eta">${cat.finish !== '-' ? `Finish: ${cat.finish}` : ' '}</div>
    </div>
  `).join('');
}

// ─── Allocation Bar ──────────────────────────────────────────

function renderAllocationBar(today: any, total: number): void {
  const bar = document.getElementById('allocationBar');
  if (!bar || total === 0) return;

  const labels = getAllHourColumnLabels(1);
  const values = [
    today.pythonHours || 0,
    today.dsaHours || 0,
    today.projectHours || 0,
    today.col4Hours || 0,
    ...(Array.isArray(today.extraHours) ? today.extraHours.map((n: number) => n || 0) : []),
  ];
  const palette = ['var(--zen-accent)', '#8b5cf6', '#10b981', '#64748b', '#f59e0b', '#22c55e', '#60a5fa', '#c084fc'];

  let segments = values
    .map((v, i) => ({ name: labels[i] || `Col ${i + 1}`, value: v, color: palette[i % palette.length] }))
    .filter((s) => s.value > 0);

  // keep bar readable: show top 6, merge remainder into "Other"
  if (segments.length > 6) {
    segments.sort((a, b) => b.value - a.value);
    const top = segments.slice(0, 6);
    const rest = segments.slice(6);
    const otherVal = rest.reduce((s, x) => s + x.value, 0);
    if (otherVal > 0) top.push({ name: 'Other', value: otherVal, color: '#334155' });
    segments = top;
  }

  bar.innerHTML = segments
    .map((s) => {
      const pct = ((s.value / total) * 100).toFixed(1);
      return `<div class="allocation-segment" style="width:${pct}%;background:${s.color}" title="${s.name}: ${s.value.toFixed(1)}h (${pct}%)"></div>`;
    })
    .join('');

  // Legend
  const legend = document.getElementById('allocationLegend');
  if (legend) {
    legend.innerHTML = segments
      .map(
        (s) =>
          `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.name}: ${s.value.toFixed(1)}h</span>`,
      )
      .join('');
  }
}


// ─── History Modal ───────────────────────────────────────────

export function renderSessionHistory(): void {
  const tbody = document.getElementById('recentSessionsBody');
  if (!tbody) return;

  const logs = appState.settings.sessionLogs || [];
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">No sessions recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs
    .slice(0, 50)
    .map((log) => {
      const d = new Date(log.date);
      return `
      <tr>
        <td>${d.toLocaleDateString()}</td>
        <td>${log.timeRange || '--'}</td>
        <td>${log.categoryName}</td>
        <td>${log.duration.toFixed(2)}h</td>
      </tr>
    `;
    })
    .join('');
}
