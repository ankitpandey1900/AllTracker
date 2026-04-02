/**
 * Dashboard feature
 *
 * Computes and renders all dashboard statistics:
 *  - Current day, total hours, streak, completion rate
 *  - Rank system (Iron → Eternal)
 *  - Category allocation bar
 *  - Daily target progress cards
 */

import { appState } from '@/state/app-state';
import { RANK_TIERS, TIER_TITLES, CATEGORY_COLORS } from '@/config/constants';
import { setTxt } from '@/utils/dom.utils';
import { renderIntelligenceBriefing } from '@/features/intelligence/intelligence.ui';
import { formatDate, formatDateDMY } from '@/utils/date.utils';
import type { RankDetails } from '@/types/tracker.types';
import { renderStudyAnalytics } from './study-analytics';

const formatNum = (num: number) => new Intl.NumberFormat().format(num);

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
    document.body.classList.remove('focus-minimized');
    document.body.style.overflow = '';
    const toggleText = document.getElementById("focusToggleText");
    if (toggleText) toggleText.textContent = "Minimize HUD";
  }
}

// ─── Rank Calculation ────────────────────────────────────────

export function getRank(totalHours: number): RankDetails {
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
      const pct = Math.max(0.01, (100 * Math.exp(-totalHours / 250)));
      const worldPos = `Top ${pct < 1 ? pct.toFixed(2) : Math.round(pct)}%`;
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
        absolutePos: Math.floor(40000000 / (1 + Math.pow(totalHours / 20, 1.6))),
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
    absolutePos: 1,
  };
}

// ─── Streak Calculation ──────────────────────────────────────

function calculateStreak(): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Scan backwards from today
  for (let i = appState.trackerData.length - 1; i >= 0; i--) {
    const day = appState.trackerData[i];
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    // Skip future days
    if (dayDate > today) continue;

    if (day.completed) {
      streak++;
    } else if (day.restDay) {
      // Rest Day: Freeze streak (don't break, but don't increment)
      continue;
    } else {
      // If we are looking at precisely "Today", don't break yet if it's not done
      if (dayDate.getTime() === today.getTime()) continue;
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
  let studyDays = 0;
  
  let maxStreak = 0;
  let runningBest = 0;

  for (const day of data) {
    const dayTotal = Array.isArray(day.studyHours) ? day.studyHours.reduce((s, n) => s + (n || 0), 0) : 0;
    totalHours += dayTotal;
    if (day.completed) {
      completedDays++;
      runningBest++;
      if (runningBest > maxStreak) maxStreak = runningBest;
    } else {
      runningBest = 0;
    }
    if (dayTotal > 0) studyDays++;
  }
  
  const streak = calculateStreak();
  const completionRate = completedDays > 0 ? (completedDays / (appState.totalDays || 1)) * 100 : 0;
  const avgHoursPerStudyDay = studyDays > 0 ? totalHours / studyDays : 0;

  const xpData = calculateXP(totalHours);
  const rankData = getRank(totalHours);

  // Update ALL Tracker Header
  const xpFill = document.getElementById('xpFill');
  if (xpFill) xpFill.style.width = `${xpData.progress}%`;

  const levelBadge = document.getElementById('levelBadge');
  if (levelBadge) levelBadge.textContent = `LVL ${xpData.level}`;

  // Update Bento Cards
  setTxt('currentDay', `DAY ${today.day}`);
  setTxt('heroDayMirror', today.day);
  setTxt('heroStartDateMirror', `Started ${formatDate(appState.startDate)}`);
  document.querySelectorAll('.hero-total-days').forEach(el => {
    el.textContent = appState.totalDays.toString();
  });
  setTxt('totalHours', `${totalHours.toFixed(1)}h`);
  setTxt('currentStreak', `${streak} DAYS`);
  setTxt('completionPercent', `${Math.round(completionRate)}%`);
  setTxt('completedDaysCount', completedDays.toString());
  setTxt('completionPercentMirror', `${Math.round(completionRate)}%`);
  setTxt('avgHoursPerDay', avgHoursPerStudyDay.toFixed(1));

  setTxt('studyRank', rankData.name.toUpperCase());
  setTxt('rankTierText', rankData.division);
  setTxt('consistencyStat', `${Math.round(completionRate)}%`);
  setTxt('bestStreakStat', maxStreak.toString());
  setTxt('startDateLabel', `Start: ${formatDate(appState.startDate)}`);
  setTxt('worldRankPos', `#${formatNum(rankData.absolutePos || 40000000)}`);

  const estimatedFinish = calculateEstimatedFinishDate(today.day, completedDays);
  setTxt('estimatedFinishDate', estimatedFinish);
  const rankXPBar = document.getElementById('rankXPBar');
  if (rankXPBar) rankXPBar.style.width = `${rankData.tierXP}%`;

  // Render Sector Tokens (Category Cards)
  renderSectorTokens(today);
  
  renderAllocationBar();
  renderStudyAnalytics();
  
  // Dynamic Hero Status
  const statusEl = document.getElementById('heroStatusTitle');
  if (statusEl) {
    statusEl.textContent = getDynamicStatusMessage(today.day, completedDays);
  }

  // Intelligence Briefing
  renderIntelligenceBriefing();
}

// Cached status message — only re-randomised when the pace category changes.
let _cachedStatusMsg = '';
let _cachedPaceCategory = '';

function getDynamicStatusMessage(currentDay: number, completedDays: number): string {
  const totalDays = appState.totalDays || 365;
  const expectedPace = currentDay / totalDays;
  const actualPace = completedDays / totalDays;
  const diff = actualPace - expectedPace;

  // Determine which bucket this sits in
  let category: string;
  if (diff < -0.05)  category = 'behind';
  else if (diff > 0.10) category = 'ahead-high';
  else if (diff > 0)    category = 'ahead-low';
  else                  category = 'steady';

  // Return the cached message if the pace category hasn't changed
  if (category === _cachedPaceCategory && _cachedStatusMsg) {
    return _cachedStatusMsg;
  }

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

  let msg: string;
  if (category === 'behind')    msg = taunts[Math.floor(Math.random() * taunts.length)];
  else if (category === 'ahead-high') msg = appreciation[Math.floor(Math.random() * appreciation.length)];
  else if (category === 'ahead-low')  msg = appreciation[Math.floor(Math.random() * 3)];
  else                                msg = steady[Math.floor(Math.random() * steady.length)];

  _cachedPaceCategory = category;
  _cachedStatusMsg = msg;
  return msg;
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

function renderSectorTokens(today: any): void {
  const container = document.getElementById('categoryCards');
  if (!container) return;

  const currentCols = appState.settings.columns || [];
  const totals = appState.trackerData.reduce(
    (acc, d) => {
      if (Array.isArray(d.studyHours)) {
        d.studyHours.forEach((v, i) => {
          acc.studyHours[i] = (acc.studyHours[i] || 0) + (v || 0);
        });
      }
      acc.problems += (d.problemsSolved || 0);
      return acc;
    },
    { studyHours: [] as number[], problems: 0 },
  );

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

  const accentClasses = ['accent-teal', 'accent-blue', 'accent-purple', 'accent-gold', 'accent-red', 'accent-cyan', 'accent-purple', 'accent-red'];
  
  const studyCats = currentCols.map((col, i) => {
    const total = totals.studyHours[i] || 0;
    const target = col.target || 0;
    return {
      label: col.name,
      value: total,
      target: target,
      accent: accentClasses[i % accentClasses.length],
      hexColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      detail: `${total.toFixed(1)} / ${target.toFixed(0)} hrs`,
      finish: estimateTargetDate(total, target),
    };
  });

  const categories = [
    ...studyCats,
    {
      label: 'Problems Solved',
      value: totals.problems,
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
      <div class="metric-value">${typeof cat.value === 'number' ? cat.value.toFixed(cat.label === 'Problems Solved' ? 0 : 1) : cat.value}</div>
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

function renderAllocationBar(): void {
  const bar = document.getElementById('allocationBar');
  if (!bar) return;

  const currentCols = appState.settings.columns || [];
  const labels = currentCols.map(c => c.name);
  
  const values = appState.trackerData.reduce(
    (acc, d) => {
      if (Array.isArray(d.studyHours)) {
        d.studyHours.forEach((v, i) => {
          acc[i] = (acc[i] || 0) + (v || 0);
        });
      }
      return acc;
    },
    [] as number[]
  );



  let segments = values
    .map((v: number, i: number) => ({ name: labels[i] || `Col ${i + 1}`, value: v, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
    .filter((s: { value: number }) => s.value > 0);

  // If no study data at all, show overall completion progress bar
  if (segments.length === 0) {
    const completedDays = appState.trackerData.filter(d => d.completed).length;
    const totalDays = appState.totalDays || 1;
    const pct = Math.round((completedDays / totalDays) * 100);
    bar.innerHTML = `<div class="allocation-segment" style="width:${pct}%;background:linear-gradient(90deg,#6a8fff,#8b5cf6)" title="Overall: ${pct}% complete"></div>`;
    const legend = document.getElementById('allocationLegend');
    if (legend) legend.innerHTML = `<div class="legend-item"><span class="legend-dot" style="background:#6a8fff"></span><span class="legend-label">Overall Completion</span><span class="legend-value">${pct}%</span></div>`;
    return;
  }

  const allTimeTotal = segments.reduce((s: number, x: { value: number }) => s + x.value, 0);

  // keep bar readable: show top 6, merge remainder into "Other"
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
      return `<div class="allocation-segment" style="width:${pct}%;background:${s.color}" title="${s.name}: ${s.value.toFixed(1)}h (${pct}%)"></div>`;
    })
    .join('');

  const legend = document.getElementById('allocationLegend');
  if (legend) {
    legend.innerHTML = segments
      .map((s: { name: string; value: number; color: string }) => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${s.color}"></span>
          <span class="legend-label">${s.name}</span>
          <span class="legend-value">${s.value.toFixed(1)}h</span>
        </div>
      `)
      .join('');
  }
}



// ─── History Modal ───────────────────────────────────────────

export function renderSessionHistory(): void {
  const tbody = document.getElementById('recentSessionsBody');
  const filterInput = document.getElementById('historyDateFilter') as HTMLInputElement;
  if (!tbody) return;

  let logs = appState.settings.sessionLogs || [];
  const filterVal = filterInput?.value; // YYYY-MM-DD

  if (filterVal) {
    logs = logs.filter(log => {
      const logDate = log.date.split('T')[0];
      return logDate === filterVal;
    });
  }

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-secondary);">
      ${filterVal ? `No sessions found for ${filterVal}.` : 'No sessions recorded yet.'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = logs
    .slice(0, 100)
    .map((log) => {
      const d = new Date(log.date);
      return `
      <tr>
        <td style="white-space:nowrap;">${formatDateDMY(d)}</td>
        <td>${log.timeRange || '--'}</td>
        <td><span class="history-cat-badge">${log.categoryName}</span></td>
        <td style="font-weight:700; color:var(--accent-blue);">${log.duration.toFixed(2)}h</td>
        <td class="session-log-note" title="${log.note || ''}">${log.note || '--'}</td>
      </tr>
    `;
    })
    .join('');
}
