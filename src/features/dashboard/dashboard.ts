/** 

 * Handles the Dashboard logic.
 * 
 * It calculates and displays all your stats:
 * - Current day, total hours, streak, and completion rate.
 * - Rank (Iron → Eternal).
 * - Category bars and progress cards.
 */

import { appState } from '@/state/app-state';
import { RANK_TIERS, TIER_TITLES, CATEGORY_COLORS } from '@/config/constants';
import { formatDate, formatDateDMY, formatTime12h, getLocalIsoDate } from '@/utils/date.utils';
import { setTxt, showToast, showLoading, hideLoading } from '@/utils/dom.utils';
import { renderIntelligenceBriefing } from '@/features/intelligence/intelligence';
import type { RankDetails } from '@/types/tracker.types';
import { renderStudyAnalytics } from './study-analytics';
import type { StudySession } from '@/types/profile.types';
import { calculateXP, calculateStreak, getRankDetails, calculateSustainability, getRecentVelocity, calculateSummaryStats, getNextRoutine } from '@/utils/calc.utils';
import { saveSettingsToStorage } from '@/services/data-bridge';
import { fetchLeaderboard, loadUserProfileCloud, fetchMySessionsCloud, migrateLocalHistoryToCloud, deleteStudySessionCloud, updateStudySessionCloud } from '@/services/vault.service';
import { VanguardService } from '@/services/vanguard.service';
import { log } from '@/utils/logger.utils';
import { adjustTrackerDataForSessionDelta, generateTable } from '@/features/tracker/tracker';
import { refreshLeaderboard } from './leaderboard';
import { isRowEditable } from '@/services/integrity';

const formatNum = (num: number) => new Intl.NumberFormat().format(num);

// Leveling logic centralized in calc.utils.ts

// --- Timer HUD Logic ---

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



// Rank logic centralized in calc.utils.ts
export function getRank(totalHours: number): RankDetails {
  return getRankDetails(totalHours);
}

// Streak logic centralized in calc.utils.ts

// --- Day Detection ---

function findTodayIndex(): number {
  const todayStr = getLocalIsoDate();
  return appState.trackerData.findIndex(d => d.date.startsWith(todayStr));
}

// --- Main UI Refresh ---

export function updateDashboard(): void {
  const data = appState.trackerData;
  if (!data || data.length === 0) return;

  const todayIndex = findTodayIndex();
  const today = todayIndex >= 0 ? data[todayIndex] : data[data.length - 1];

  const { totalHours, completedDays, studyDays, maxStreak } = calculateSummaryStats(data);
  const streak = calculateStreak(data);
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
  
  const sustain = calculateSustainability(data);
  const sustainArrow = sustain.trend === 'up' 
    ? '<span style="color: #22c55e; margin-left: 5px;">↑</span>' 
    : sustain.trend === 'down' 
      ? '<span style="color: #ef4444; margin-left: 5px;">↓</span>' 
      : '';
  const sustainLabelEl = document.getElementById('sustainabilityLabel');
  if (sustainLabelEl) sustainLabelEl.innerHTML = `${sustain.label}${sustainArrow}`;
  setTxt('sustainabilityDesc', sustain.description);

  setTxt('studyRank', rankData.name.toUpperCase());
  setTxt('rankTierText', rankData.division);
  setTxt('currentStreakStat', streak.toString());
  setTxt('bestStreakStat', maxStreak.toString());
  setTxt('totalHoursStartDate', `Start: ${formatDate(appState.startDate)}`);
  setTxt('estimatedStartDate', `Start: ${formatDate(appState.startDate)}`);
  setTxt('worldRankPos', `#${formatNum(rankData.absolutePos || 40000000)}`);

  const { date: estimatedFinish, trend: finishTrend } = calculateEstimatedFinishWithTrend(today.day, completedDays);
  const finishArrow = finishTrend === 'up' 
    ? '<span style="color: #22c55e; margin-left: 5px;">↑</span>' 
    : finishTrend === 'down' 
      ? '<span style="color: #ef4444; margin-left: 5px;">↓</span>' 
      : '';
  const finishEl = document.getElementById('estimatedFinishDate');
  if (finishEl) finishEl.innerHTML = `${estimatedFinish}${finishArrow}`;
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

  // Up Next Routine
  updateHeroRoutine();

  // Render Velocity Sparkline
  renderVelocitySparkline(data);

  // Apply Mission Auras to KPI Cards
  applyKPIMissionAuras(completionRate, streak, today.day);

  // Initialize Interactive Parallax
  initInteractiveParallax();

  // 🛡️ VANGUARD: Gamification & Engagement
  updateRivalryHUD();
}

/** ⚔️ RIVALRY HUD: Identifies the operative ranked exactly +1 above the user */
async function updateRivalryHUD(): Promise<void> {
  const rival = await VanguardService.getRivalContext();
  const hud = document.getElementById('rivalHUD');
  if (!hud) return;

  const labelEl = hud.querySelector('.label') as HTMLElement | null;
  const handleEl = document.getElementById('rivalHandle');
  const metaEl = hud.querySelector('.meta') as HTMLElement | null;

  if (rival) {
    // ⚔️ NORMAL MODE: Has a target above
    hud.style.display = 'block';
    hud.style.border = '1px solid rgba(239, 68, 68, 0.3)';
    hud.style.background = 'rgba(239, 68, 68, 0.05)';
    if (labelEl) { labelEl.style.color = '#ef4444'; labelEl.textContent = 'TARGET IDENTIFIED 🎯'; }
    if (handleEl) { handleEl.style.color = '#ef4444'; handleEl.textContent = rival.handle; }
    if (metaEl) metaEl.innerHTML = `RANK <span id="rivalRank">${rival.rank}</span> • <span id="rivalGap" style="color: #fca5a5; font-weight: 900;">-${rival.gap}h</span> TO OVERTAKE`;
  } else {
    // 👑 KING MODE: User is #1 — show throne state
    hud.style.display = 'block';
    hud.style.border = '1px solid rgba(250, 204, 21, 0.4)';
    hud.style.background = 'rgba(250, 204, 21, 0.06)';
    if (labelEl) { labelEl.style.color = '#facc15'; labelEl.textContent = 'TOP OF THE BOARD 👑'; }
    if (handleEl) { handleEl.style.color = '#facc15'; handleEl.textContent = 'RANK #1'; }
    if (metaEl) {
      const defenseLines = [
        'Others are studying right now to take your #1 — stay ahead!',
        'Rank #1 is yours today. What about tomorrow?',
        'The squad is chasing you. Don\'t give them a chance.',
        'Everyone below you is gunning for your spot. Keep grinding!',
      ];
      metaEl.innerHTML = `<span style="color: #fde68a; font-style: italic;">${defenseLines[Math.floor(Math.random() * defenseLines.length)]}</span>`;
    }
  }
}




/** Finds the next uncompleted routine for today and displays it in the Hero HUD */
function updateHeroRoutine(): void {
  const container = document.getElementById('heroRoutineNext');
  const textEl = document.getElementById('heroNextRoutineText');
  const timeEl = document.getElementById('heroNextRoutineTime');
  if (!container || !textEl || !timeEl) return;

  const next = getNextRoutine(appState.routines || []);

  if (!next) {
    container.style.display = 'none';
    return;
  }

  textEl.textContent = next.title;
  timeEl.textContent = next.time;
  container.style.display = 'flex';
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

/** 
 * Analyzes mission status and applies glowing auras to core KPI cards.
 */
function applyKPIMissionAuras(completionRate: number, streak: number, day: number): void {
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
 * Calculates mouse position relative to center of cards to apply 3D rotation.
 */
function initInteractiveParallax(): void {
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

function calculateEstimatedFinishWithTrend(currentDayNumber: number, completedDays: number): { date: string; trend: 'up' | 'down' | 'stable' } {
  if (currentDayNumber <= 0) return { date: 'Analyzing...', trend: 'stable' };
  if (completedDays <= 0) return { date: 'Need 1 session', trend: 'stable' };
  
  const pace = completedDays / currentDayNumber;
  if (pace <= 0) return { date: 'Studying...', trend: 'stable' };
  
  const remainingCompletions = Math.max(0, appState.totalDays - completedDays);
  if (remainingCompletions === 0) return { date: 'Goal Completed! 🏆', trend: 'stable' };

  const daysNeeded = Math.ceil(remainingCompletions / pace);
  const eta = new Date();
  eta.setDate(eta.getDate() + daysNeeded);
  
  // Trend calculation: compare current pace vs pace as of yesterday
  const yesterdayDayNumber = currentDayNumber - 1;
  const wasCompletedToday = appState.trackerData[appState.trackerData.length - 1]?.completed || false;
  const yesterdayCompletedDays = wasCompletedToday ? completedDays - 1 : completedDays;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (yesterdayDayNumber > 0 && yesterdayCompletedDays > 0) {
    const yesterdayPace = yesterdayCompletedDays / yesterdayDayNumber;
    if (pace > yesterdayPace + 0.01) trend = 'up'; // Pace getting faster (Green up)
    else if (pace < yesterdayPace - 0.01) trend = 'down'; // Pace slowing down (Red down)
  }

  return { date: formatDate(eta), trend };
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

/**
 * Renders a tactical sparkline showing the last 14 days of study velocity.
 */
function renderVelocitySparkline(trackerData: any[]): void {
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

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(96, 165, 250, 0.2)');
  grad.addColorStop(1, 'rgba(96, 165, 250, 0)');
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fillStyle = grad;
  ctx.fill();
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



// --- Session History Helpers ---

function getSubjectColor(name: string): { bg: string; border: string; text: string } {
  const palette = [
    { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.35)',  text: '#93c5fd' },
    { bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.35)', text: '#c4b5fd' },
    { bg: 'rgba(52,211,153,0.11)',  border: 'rgba(52,211,153,0.35)',  text: '#6ee7b7' },
    { bg: 'rgba(251,191,36,0.11)',  border: 'rgba(251,191,36,0.35)',  text: '#fcd34d' },
    { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', text: '#fca5a5' },
    { bg: 'rgba(34,211,238,0.11)',  border: 'rgba(34,211,238,0.35)',  text: '#67e8f9' },
    { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)',  text: '#fdba74' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getRelativeDate(dateStr: string): { primary: string; day: string } {
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  const day = dayNames[date.getDay()];
  const fmt = `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
  if (diff === 0) return { primary: 'Today',       day: `${day} \u00b7 ${fmt}` };
  if (diff === 1) return { primary: 'Yesterday',   day: `${day} \u00b7 ${fmt}` };
  if (diff < 7)   return { primary: `${diff}d ago`, day: `${day} \u00b7 ${fmt}` };
  return { primary: fmt, day };
}

// --- Session History Popup ---

export async function renderSessionHistory(): Promise<void> {
  const container    = document.getElementById('recentSessionsBody');
  const fromInput    = document.getElementById('sh-from-date') as HTMLInputElement;
  const toInput      = document.getElementById('sh-to-date')   as HTMLInputElement;
  const migrationBanner = document.getElementById('historyMigrationBanner');

  if (!container) return;
  if (migrationBanner) migrationBanner.style.display = 'none';

  showLoading('Loading session history...');
  const cloudLogs = await fetchMySessionsCloud();
  hideLoading();

  const localSaved = localStorage.getItem('all_tracker_history');
  const localLogs: StudySession[] = localSaved ? JSON.parse(localSaved) : [];

  // ── DATE RANGE FILTER ────────────────────────────────────────
  const fromVal = fromInput?.value || '';   // YYYY-MM-DD
  const toVal   = toInput?.value   || '';   // YYYY-MM-DD

  let displayLogs = cloudLogs.filter((log: any) => {
    const d = log.log_date || (log.end_at || '').split('T')[0];
    if (!d) return false;
    if (fromVal && d < fromVal) return false;
    if (toVal   && d > toVal)   return false;
    return true;
  });

  const activeFilter = fromVal || toVal;
  const isOnline = !!localStorage.getItem('tracker_username');

  if (displayLogs.length === 0) {
    const hasRealLocal = !isOnline && localLogs.length > 0 && localLogs.some((l: any) => l.duration > 0 || l.note);
    const fmtDMYq = (iso: string) => { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
    const msg = activeFilter
      ? `No sessions found${fromVal ? ` from ${fmtDMYq(fromVal)}` : ''}${toVal ? ` to ${fmtDMYq(toVal)}` : ''}.`
      : hasRealLocal
        ? 'Sync your legacy data to see history here.'
        : 'No sessions recorded yet. Start a study timer!';
    container.innerHTML = `
      <div class="sh-empty">
        <div class="sh-empty-icon">📋</div>
        <div class="sh-empty-text">${msg}</div>
      </div>`;
    return;
  }

  // ── STATS BAR ────────────────────────────────────────────────
  const totalHours = displayLogs.reduce((s: number, l: any) => s + (l.duration || 0), 0);
  const maxDuration = Math.max(...displayLogs.map((l: any) => l.duration || 0), 0.001);
  const statsBar = document.getElementById('sh-stats-bar');

  /** Convert YYYY-MM-DD → DD/MM/YYYY */
  const fmtDMY = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  if (statsBar) {
    const allDates = displayLogs
      .map((l: any) => l.log_date || (l.end_at || '').split('T')[0])
      .filter(Boolean).sort();
    const firstDate = allDates[0] ?? '';
    const lastDate  = allDates[allDates.length - 1] ?? '';
    const rangeText = firstDate === lastDate
      ? fmtDMY(firstDate)
      : `${fmtDMY(firstDate)} → ${fmtDMY(lastDate)}`;
    statsBar.innerHTML = `
      <span class="sh-stat"><span class="sh-stat-val">${displayLogs.length}</span><span class="sh-stat-lbl">Sessions</span></span>
      <span class="sh-stat-div"></span>
      <span class="sh-stat"><span class="sh-stat-val">${totalHours.toFixed(2)}h</span><span class="sh-stat-lbl">Total Time</span></span>
      <span class="sh-stat-div"></span>
      <span class="sh-stat"><span class="sh-stat-val sh-stat-range">${rangeText}</span><span class="sh-stat-lbl">Date Range</span></span>
    `;
    statsBar.style.display = 'flex';
  }

  // ── HIERARCHICAL GROUPING ─────────────────────────────────────
  const dateMap = new Map<string, { total_hours: number, session_count: number, subjects: Map<string, any[]> }>();

  displayLogs.forEach((log: any) => {
    const d = log.log_date || (log.end_at || '').split('T')[0];
    if (!d || d === 'null') return;
    if (!dateMap.has(d)) dateMap.set(d, { total_hours: 0, session_count: 0, subjects: new Map() });
    const dayData = dateMap.get(d)!;
    dayData.total_hours += (log.duration || 0);
    dayData.session_count++;
    const sub = log.subject || 'General';
    if (!dayData.subjects.has(sub)) dayData.subjects.set(sub, []);
    dayData.subjects.get(sub)!.push(log);
  });

  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

  // ── CSS GRID ROW RENDERING ────────────────────────────────────
  const rows: string[] = [];

  sortedDates.forEach(date => {
    const dayData = dateMap.get(date)!;
    const rel = getRelativeDate(date);

    // DATE GROUP ROW
    rows.push(`
      <div class="sh-date-row sh-row" data-date="${date}">
        <div class="sh-date-label">
          <span class="sh-chevron">▶</span>
          <div class="sh-date-stack">
            <span class="sh-date-primary">${rel.primary}</span>
            <span class="sh-date-secondary">${rel.day}</span>
          </div>
        </div>
        <div class="sh-date-sessions-label">${dayData.session_count} session${dayData.session_count !== 1 ? 's' : ''}</div>
        <div class="sh-total-hours">${dayData.total_hours.toFixed(2)}h</div>
        <div></div>
        <div></div>
      </div>
    `);

    Array.from(dayData.subjects.keys()).forEach(subName => {
      // Sort sessions chronologically ascending for sensible numbering
      const sessions = dayData.subjects.get(subName)!.sort((a: any, b: any) => {
        const tA = new Date(a.start_at || a.end_at || 0).getTime();
        const tB = new Date(b.start_at || b.end_at || 0).getTime();
        return tA - tB;
      });
      const subHours = sessions.reduce((s: number, l: any) => s + (l.duration || 0), 0);
      const col = getSubjectColor(subName);

      // SUBJECT ROW
      rows.push(`
        <div class="sh-subject-row sh-row sh-child sh-child-${date}">
          <div>
            <span class="sh-subject-badge" style="background:${col.bg}; border-color:${col.border}; color:${col.text};">${subName}</span>
            <span class="sh-subject-count">${sessions.length} session${sessions.length > 1 ? 's' : ''}</span>
          </div>
          <div></div>
          <div class="sh-sub-hours" style="color:${col.text};">${subHours.toFixed(2)}h</div>
          <div></div>
          <div></div>
        </div>
      `);

      // SESSION ROWS
      sessions.forEach((log: any, idx: number) => {
        const duration   = log.duration || 0;
        const startTime  = log.start_at ? formatTime12h(log.start_at) : '—';
        const endTime    = log.end_at   ? formatTime12h(log.end_at)   : '—';
        
        let note = (log.note && log.note !== 'null' && log.note.trim()) ? log.note : '';
        
        // Extract breaks from note strictly to render a badge
        let breakCount = 0;
        const breakMatch = note.match(/\[Breaks:\s*(.+?)\]/);
        if (breakMatch) {
          const parts = breakMatch[1].split(',');
          parts.forEach((p: string) => {
            const mult = p.match(/\/ (\d+)x/);
            breakCount += mult ? parseInt(mult[1]) : 1;
          });
        }
        
        const breakBadge = breakCount > 0 
          ? `<span style="margin-left: 8px; font-size: 0.70rem; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56,189,248,0.2); padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;">${breakCount} BREAK${breakCount > 1 ? 'S' : ''}</span>` 
          : '';

        // Session numbering now uses the sorted index chronologically!
        const sessionNum = idx + 1;
        const barW       = maxDuration > 0 ? Math.max(6, Math.round((duration / maxDuration) * 100)) : 6;
        const safeNote   = note.replace(/"/g, '&quot;');

        rows.push(`
          <div class="sh-session-row sh-row sh-child sh-child-${date}${idx % 2 === 1 ? ' alt' : ''}" data-session-id="${log.id}" data-session-duration="${duration}" data-session-subject="${subName}" data-session-note="${safeNote}" data-date="${log.log_date}">
            <div class="sh-session-num">Session ${sessionNum} ${breakBadge}</div>
            <div class="sh-time">
              ${startTime}<span class="sh-time-sep">–</span>${endTime}
            </div>
            <div class="sh-duration">
              <span class="sh-dur-val">${duration.toFixed(2)}h</span>
              <div class="sh-dur-bar"><div class="sh-dur-fill" style="width:${barW}%; background:${col.text};"></div></div>
            </div>
            <div class="sh-category" style="color:${col.text};">${subName}</div>
            <div class="sh-note${note ? '' : ' empty'}" title="${safeNote}">${note ? note : '<span style="opacity:0.28;">—</span>'}</div>
            <div class="sh-actions">
              ${isRowEditable(log.log_date) ? `
                <button class="sh-btn-edit" title="Edit session" data-id="${log.id}" data-duration="${duration}" data-subject="${subName}" data-note="${safeNote}">✎</button>
                <button class="sh-btn-delete" title="Delete session" data-id="${log.id}">🗑</button>
              ` : '<span style="opacity:0.2; font-size: 0.7rem; letter-spacing: 1px;">LOCKED</span>'}
            </div>
          </div>
        `);
      });
    });
  });

  container.innerHTML = rows.join('');

  // ── BIND CLICK LISTENERS ─────────────────────────────────────
  document.querySelectorAll<HTMLElement>('.sh-date-row').forEach(row => {
    row.addEventListener('click', () => {
      const date = row.dataset.date!;
      const isOpen = row.classList.toggle('open');
      document.querySelectorAll<HTMLElement>(`.sh-child-${date}`).forEach(child => {
        child.classList.toggle('expanded', isOpen);
      });
    });
  });

  // ── DELETE HANDLER ────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.sh-btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id!;
      if (!id) return;
      const confirmed = window.confirm('Delete this session? This cannot be undone.');
      if (!confirmed) return;
      try {
        const date     = btn.closest('.sh-session-row')?.getAttribute('data-date') || '';
        const duration = parseFloat(btn.dataset.duration || '0');
        const subject  = btn.dataset.subject || '';

        await deleteStudySessionCloud(id);

        // 🛰️ RECONCILIATION: Adjust local tracker data so charts/XP update
        if (date && subject) {
          await adjustTrackerDataForSessionDelta(date, subject, -duration);
        }

        showToast('Session deleted ✓');
        await renderSessionHistory();

        // 🔄 UI REFRESH: Sync all dashboard metrics and the main grid
        updateDashboard();
        generateTable();
        refreshLeaderboard();
      } catch (err) {
        showToast('Failed to delete session.');
        log.error('Delete session failed', err);
      }
    });
  });

  // ── EDIT HANDLER ──────────────────────────────────────────────
  document.querySelectorAll<HTMLButtonElement>('.sh-btn-edit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id!;
      const oldDuration = parseFloat(btn.dataset.duration || '0');
      const oldSubject  = btn.dataset.subject || '';
      const oldNote     = btn.dataset.note || '';

      // Inject a custom edit modal into DOM
      const modalId = 'sh-edit-modal';
      let modal = document.getElementById(modalId);
      if (modal) modal.remove();

      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:rgba(0,0,0,0.7)', 'backdrop-filter:blur(6px)',
      ].join(';');

      modal.innerHTML = `
        <div style="background:#0f1729; border:1px solid rgba(99,102,241,0.3); border-radius:16px; padding:28px 32px; min-width:380px; max-width:520px; width:90%; box-shadow:0 24px 48px rgba(0,0,0,0.6);">
          <h3 style="margin:0 0 20px; font-size:1.1rem; color:#e2e8f0; letter-spacing:1px;">✎ EDIT SESSION</h3>
          <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; letter-spacing:0.5px;">DURATION (hours)</label>
          <input id="sh-edit-duration" type="number" min="0" step="0.01" value="${oldDuration}" style="width:100%; padding:10px 14px; background:#1e2a45; border:1px solid rgba(99,102,241,0.3); border-radius:8px; color:#e2e8f0; font-size:0.95rem; margin-bottom:16px; box-sizing:border-box;">
          <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; letter-spacing:0.5px;">SUBJECT</label>
          <input id="sh-edit-subject" type="text" value="${oldSubject}" style="width:100%; padding:10px 14px; background:#1e2a45; border:1px solid rgba(99,102,241,0.3); border-radius:8px; color:#e2e8f0; font-size:0.95rem; margin-bottom:16px; box-sizing:border-box;">
          <label style="display:block; margin-bottom:6px; font-size:0.75rem; color:#94a3b8; letter-spacing:0.5px;">NOTE</label>
          <textarea id="sh-edit-note" rows="3" style="width:100%; padding:10px 14px; background:#1e2a45; border:1px solid rgba(99,102,241,0.3); border-radius:8px; color:#e2e8f0; font-size:0.95rem; margin-bottom:24px; box-sizing:border-box; resize:vertical;">${oldNote.replace(/&quot;/g,'"')}</textarea>
          <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button id="sh-edit-cancel" style="padding:10px 20px; border-radius:8px; border:1px solid rgba(148,163,184,0.3); background:transparent; color:#94a3b8; cursor:pointer; font-size:0.9rem;">Cancel</button>
            <button id="sh-edit-save" style="padding:10px 24px; border-radius:8px; border:none; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; cursor:pointer; font-size:0.9rem; font-weight:600;">Save Changes</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('sh-edit-cancel')!.onclick = () => modal!.remove();
      modal.addEventListener('click', (ev) => { if (ev.target === modal) modal!.remove(); });

      document.getElementById('sh-edit-save')!.onclick = async () => {
        const newDuration = parseFloat((document.getElementById('sh-edit-duration') as HTMLInputElement).value) || 0;
        const newSubject  = (document.getElementById('sh-edit-subject')  as HTMLInputElement).value.trim() || oldSubject;
        const newNote     = (document.getElementById('sh-edit-note')     as HTMLTextAreaElement).value.trim();
        try {
          const date = btn.closest('.sh-session-row')?.getAttribute('data-date') || '';

          await updateStudySessionCloud(id, { duration: newDuration, subject: newSubject, note: newNote });
          
          // 🛰️ RECONCILIATION: Reflect changes in local charts/XP
          if (date) {
            // First subtract the old value, then add the new one
            await adjustTrackerDataForSessionDelta(date, oldSubject, -oldDuration);
            await adjustTrackerDataForSessionDelta(date, newSubject, newDuration);
          }

          modal!.remove();
          showToast('Session updated ✓');
          await renderSessionHistory();

          // 🔄 UI REFRESH: Sync across all views
          updateDashboard();
          generateTable();
          refreshLeaderboard();
        } catch (err) {
          showToast('Failed to update session.');
          log.error('Update session failed', err);
        }
      };
    });
  });
}

/** Decommissioned: Legacy Migration Engine (Successor: Direct-to-Cloud Pipeline) */

