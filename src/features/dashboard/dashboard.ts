/** 
 * DASHBOARD CONTROLLER (Modularized)
 * 
 * Orchestrates the calculation and display of user stats, rank, and engagement metrics.
 * UI rendering is delegated to dashboard.renderers.ts and session-history.ts.
 */

import { appState, ensureTimelineIntegrity } from '@/state/app-state';
import { formatDate, getLocalIsoDate, formatDuration } from '@/utils/date.utils';
import { setTxt } from '@/utils/dom.utils';
import { renderIntelligenceBriefing } from '@/features/intelligence/intelligence';
import type { RankDetails } from '@/types/tracker.types';
import { renderStudyAnalytics } from './study-analytics';
import {
  calculateXP,
  calculateStreak,
  getRankDetails,
  calculateSustainability,
  calculateSummaryStats,
  getNextRoutine,
  calculateEstimatedFinishWithTrend,
  getDynamicStatusMessage,
  calculateVerificationScore,
  calculateCompetitiveXP
} from '@/utils/calc.utils';
import { VanguardService } from '@/services/vanguard.service';
import { QuotesManager } from './quotes.manager';

// --- Sub-Module Imports ---
import {
  renderSectorTokens,
  renderVelocitySparkline,
  renderAllocationBar,
  applyKPIMissionAuras,
  initInteractiveParallax
} from './dashboard.renderers';
import { lbAllUsers } from './leaderboard.state';

const formatNum = (num: number) => new Intl.NumberFormat().format(num);

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

export function getRank(totalHours: number): RankDetails {
  return getRankDetails(totalHours);
}

// --- Day Detection ---

function findTodayIndex(): number {
  const todayStr = getLocalIsoDate();
  return appState.trackerData.findIndex(d => d.date.startsWith(todayStr));
}

// --- Main UI Refresh ---

export function updateDashboard(): void {
  const data = appState.trackerData;
  if (!data || data.length === 0) return;

  // 🛡️ LOCAL DAY SYNC: Ensure we are showing the absolute current day
  ensureTimelineIntegrity();

  // 🎙️ Dynamic Wisdom Rotation (User-Centric)
  QuotesManager.getInstance().startRotation();

  const todayIndex = findTodayIndex();

  // If today isn't found even after integrity check, we use a placeholder instead of yesterday
  const today = todayIndex >= 0 ? data[todayIndex] : {
    day: data.length + 1,
    date: getLocalIsoDate(),
    studyHours: [],
    problemsSolved: 0,
    topics: '',
    project: '',
    completed: false
  };

  const { totalHours: localTotal, completedDays, studyDays, maxStreak } = calculateSummaryStats(data);
  const streak = calculateStreak(data);
  const completionRate = completedDays > 0 ? (completedDays / (appState.totalDays || 1)) * 100 : 0;

  // 🛰️ UNIFIED DATA SOURCE: Mirror the Leaderboard's logic
  // We use the MAX of local table data or cloud-verified data.
  const totalHours = Math.max(localTotal, appState.verifiedTotalHours);
  const rankScore = Math.max(calculateCompetitiveXP(totalHours, streak, calculateVerificationScore(appState.verifiedHours, localTotal)), appState.verifiedRankScore);

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
  setTxt('totalHours', formatDuration(totalHours) || '0h');
  setTxt('currentStreak', `${streak} DAYS`);
  setTxt('completionPercent', `${Math.round(completionRate)}%`);
  setTxt('completedDaysCount', completedDays.toString());
  setTxt('completionPercentMirror', `${Math.round(completionRate)}%`);

  const avgHoursPerStudyDay = studyDays > 0 ? totalHours / studyDays : 0;
  setTxt('avgHoursPerDay', formatDuration(avgHoursPerStudyDay) || '0m');

  const sustain = calculateSustainability(data);
  const sustainArrow = sustain.trend === 'up'
    ? '<span style="color: #22c55e; margin-left: 5px;">↑</span>'
    : sustain.trend === 'down'
      ? '<span style="color: #ef4444; margin-left: 5px;">↓</span>'
      : '';
  const sustainLabelEl = document.getElementById('sustainabilityLabel');
  if (sustainLabelEl) sustainLabelEl.innerHTML = `${sustain.label}${sustainArrow}`;
  setTxt('sustainabilityDesc', sustain.description);

  // --- Competitive Rank Score (Unified with Leaderboard) ---
  setTxt('rankScoreDisplay', rankScore.toLocaleString());
  setTxt('currentStreakStat', streak.toString());
  setTxt('bestStreakStat', maxStreak.toString());
  setTxt('totalHoursStartDate', `Start: ${formatDate(appState.startDate)}`);
  setTxt('estimatedStartDate', `Start: ${formatDate(appState.startDate)}`);

  // --- Mission Telemetry ---
  const { date: estimatedFinish, trend: finishTrend } = calculateEstimatedFinishWithTrend(today.day, completedDays);
  const finishArrow = finishTrend === 'up'
    ? '<span style="color: #22c55e; margin-left: 5px;">↑</span>'
    : finishTrend === 'down'
      ? '<span style="color: #ef4444; margin-left: 5px;">↓</span>'
      : '';
  const finishEl = document.getElementById('estimatedFinishDate');
  if (finishEl) finishEl.innerHTML = `${estimatedFinish}${finishArrow}`;

  // --- Delegate Rendering to Sub-Modules ---
  renderSectorTokens(today);
  renderAllocationBar();
  renderStudyAnalytics();
  updateHeroRoutine();
  renderVelocitySparkline(data);

  // Dynamic Hero Status / Wisdom
  const statusEl = document.getElementById('heroStatusTitle');
  if (statusEl) {
    const currentQuote = QuotesManager.getInstance().getCurrentQuote();
    if (!currentQuote) {
      statusEl.textContent = getDynamicStatusMessage(today.day, completedDays);
    }
    // If quote exists, it's already being managed by QuotesManager.rotate() timer
  }

  // Intelligence Briefing
  renderIntelligenceBriefing();

  // Apply Mission Auras to KPI Cards
  applyKPIMissionAuras(completionRate, streak, today.day);

  // Initialize Interactive Parallax
  initInteractiveParallax();

  // 🛡️ VANGUARD: Gamification & Engagement
  updateRivalryHUD();
}

/** ⚔️ RIVALRY HUD: Identifies the operative ranked exactly +1 above the user */
export function updateRivalryHUD(): void {
  const hud = document.getElementById('rivalHUD');
  if (hud) hud.style.display = 'none';
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
