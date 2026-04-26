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
  // Use shared state to avoid redundant fetches
  const rival = VanguardService.getRivalContext(lbAllUsers || []);
  
  const hud = document.getElementById('rivalHUD');
  if (!hud) return;

  const labelEl = hud.querySelector('.label') as HTMLElement | null;
  const handleEl = document.getElementById('rivalHandle');
  const metaEl = hud.querySelector('.meta') as HTMLElement | null;

  if (rival) {
    hud.style.display = 'block';
    hud.style.border = '1px solid rgba(239, 68, 68, 0.3)';
    hud.style.background = 'rgba(239, 68, 68, 0.05)';
    if (labelEl) { labelEl.style.color = '#ef4444'; labelEl.textContent = 'TARGET IDENTIFIED 🎯'; }
    if (handleEl) { handleEl.style.color = '#ef4444'; handleEl.textContent = rival.handle; }
    if (metaEl) metaEl.innerHTML = `RANK <span id="rivalRank">${rival.rank}</span> • <span id="rivalGap" style="color: #fca5a5; font-weight: 900;">-${rival.gapPoints} PTS (${rival.gap}H)</span> TO OVERTAKE`;
  } else {
    // 🏆 RANK #1 — Show who's chasing and by how much
    const sorted = [...(lbAllUsers || [])].sort((a, b) => {
      return calculateCompetitiveXP(b.total_hours, b.current_streak || 0, b.integrity_score || 0)
           - calculateCompetitiveXP(a.total_hours, a.current_streak || 0, a.integrity_score || 0);
    });
    const chaser = sorted[1];
    const me = sorted[0];

    hud.style.display = 'block';
    hud.style.border = '1px solid rgba(250, 204, 21, 0.4)';
    hud.style.background = 'rgba(250, 204, 21, 0.06)';
    if (labelEl) { labelEl.style.color = '#facc15'; labelEl.textContent = 'TOP OF THE BOARD 👑'; }
    if (handleEl) { handleEl.style.color = '#facc15'; handleEl.textContent = 'RANK #1'; }
    if (metaEl) {
      if (chaser && me) {
        const gapHrs = Number(((me.total_hours || 0) - (chaser.total_hours || 0)).toFixed(1));
        const chaserHandle = `@${chaser.display_name}`;

        let threatMsg = '';
        let threatColor = '#fde68a';
        if (gapHrs < 0.5) {
          threatMsg = `⚠️ ${chaserHandle} is only ${(gapHrs * 60).toFixed(0)}m behind. START NOW.`;
          threatColor = '#ef4444';
        } else if (gapHrs < 2) {
          threatMsg = `🔥 ${chaserHandle} is ${gapHrs}h away. Don't stop — the gap is closing.`;
          threatColor = '#fb923c';
        } else if (gapHrs < 5) {
          threatMsg = `⚡ ${chaserHandle} is ${gapHrs}h behind. Stay focused to keep the crown.`;
          threatColor = '#fbbf24';
        } else {
          threatMsg = `👑 ${gapHrs}h ahead of ${chaserHandle}. Dominating the board.`;
          threatColor = '#a3e635';
        }
        metaEl.innerHTML = `<span style="color: ${threatColor}; font-style: italic;">${threatMsg}</span>`;
      } else {
        metaEl.innerHTML = `<span style="color: #fde68a; font-style: italic;">You're the first on the board. Set the standard.</span>`;
      }
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
