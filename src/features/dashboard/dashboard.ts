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
import { formatDate, formatDateDMY, formatTime12h } from '@/utils/date.utils';
import { setTxt, showToast, showLoading, hideLoading } from '@/utils/dom.utils';
import { renderIntelligenceBriefing } from '@/features/intelligence/intelligence';
import type { RankDetails } from '@/types/tracker.types';
import { renderStudyAnalytics } from './study-analytics';
import type { StudySession } from '@/types/profile.types';
import { calculateXP, calculateStreak, getRankDetails } from '@/utils/calc.utils';
import { saveSettingsToStorage } from '@/services/data-bridge';
import { fetchLeaderboard, loadUserProfileCloud, fetchMySessionsCloud, migrateLocalHistoryToCloud } from '@/services/supabase.service';

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < appState.trackerData.length; i++) {
    const d = new Date(appState.trackerData[i].date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return i;
  }
  return -1;
}

// --- Main UI Refresh ---

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

  // Up Next Routine
  updateHeroRoutine();
}

/** Finds the next uncompleted routine for today and displays it in the Hero HUD */
function updateHeroRoutine(): void {
  const container = document.getElementById('heroRoutineNext');
  const textEl = document.getElementById('heroNextRoutineText');
  const timeEl = document.getElementById('heroNextRoutineTime');
  if (!container || !textEl || !timeEl) return;

  const items = appState.routines || [];
  if (items.length === 0) {
    container.style.display = 'none';
    return;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const nowStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  // Filter for today's uncompleted routines
  const todayRoutines = items.filter(r => {
    const activeToday = !r.days || r.days.length === 0 || r.days.includes(currentDay);
    return activeToday && !r.completed;
  });

  if (todayRoutines.length === 0) {
    container.style.display = 'none';
    return;
  }

  // Sort by time
  const sorted = [...todayRoutines].sort((a, b) => a.time.localeCompare(b.time));

  // Find first one upcoming, or first uncompleted if all are past
  let next = sorted.find(r => r.time >= nowStr);
  if (!next) next = sorted[0];

  textEl.textContent = next.title;
  timeEl.textContent = `@ ${formatTime12h(next.time)}`;
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

function calculateEstimatedFinishDate(currentDayNumber: number, completedDays: number): string {
  if (currentDayNumber <= 0) return 'Analyzing...';
  if (completedDays <= 0) return 'Need 1 session';
  
  const pace = completedDays / currentDayNumber;
  if (pace <= 0) return 'Studying...';
  
  const remainingCompletions = Math.max(0, appState.totalDays - completedDays);
  if (remainingCompletions === 0) return 'Goal Completed! 🏆';

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



// --- Session History Popup ---

export async function renderSessionHistory(): Promise<void> {
  const tbody = document.getElementById('recentSessionsBody');
  const filterInput = document.getElementById('historyDateFilter') as HTMLInputElement;
  const migrationBanner = document.getElementById('historyMigrationBanner');

  if (!tbody) return;

  // 🛡️ CLOUD DOMINANCE: Legacy manual migration has been decommissioned.
  // Mission archives are now handled via a direct-to-cloud automated pipeline.
  if (migrationBanner) migrationBanner.style.display = 'none';

  // 2. Fetch High-Fidelity History from Cloud
  showLoading('Connecting to mission archives...');
  const cloudLogs = await fetchMySessionsCloud();
  hideLoading();

  // Legacy local fallback for offline synchronization (StudySession format)
  const localSaved = localStorage.getItem('all_tracker_history');
  const localLogs: StudySession[] = localSaved ? JSON.parse(localSaved) : [];

  const filterVal = filterInput?.value; // YYYY-MM-DD
  let displayLogs = filterVal 
    ? cloudLogs.filter(log => {
        const dCandidate = log.log_date || (log.end_at || '').split('T')[0];
        return dCandidate === filterVal;
    })
    : cloudLogs;

  // 🛡️ CLOUD-FIRST PROTECTION: If we are logged in, we ignore the 'Ghost' legacy warning
  const isOnline = !!localStorage.getItem('operative_sync_id');
  if (displayLogs.length === 0) {
    const hasRealLocal = !isOnline && localLogs.length > 0 && localLogs.some(l => l.duration > 0 || l.note);
    
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-secondary);">
      ${filterVal ? `No sessions found for ${filterVal}.` : (hasRealLocal ? 'Sync your legacy data to see history here.' : 'No sessions recorded in cloud archives.')}
    </td></tr>`;
    return;
  }

  // 🧠 HIERARCHICAL GROUPING ENGINE
  const dateMap = new Map<string, { total_hours: number, session_count: number, subjects: Map<string, any[]> }>();
  
  displayLogs.forEach(log => {
      // 🛡️ DATE RESILIENCE: Use explicit log_date or extract from end_at
      const d = log.log_date || (log.end_at || '').split('T')[0];
      if (!d || d === 'null') return; // Skip invalid entries

      if (!dateMap.has(d)) {
          dateMap.set(d, { total_hours: 0, session_count: 0, subjects: new Map() });
      }
      const dayData = dateMap.get(d)!;
      dayData.total_hours += (log.duration || 0);
      dayData.session_count++;
      
      const sub = log.subject || 'GENERAL';
      if (!dayData.subjects.has(sub)) dayData.subjects.set(sub, []);
      dayData.subjects.get(sub)!.push(log);
  });

  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

  tbody.innerHTML = sortedDates.map(date => {
      const dayData = dateMap.get(date)!;
      const subjects = dayData.subjects;
      
      // 📅 FORMAT DATE: DD/MM/YYYY
      const dateParts = date.split('-');
      const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      
      const detailsHtml = Array.from(subjects.keys()).map(subName => {
          const sessions = subjects.get(subName)!;
          const subHours = sessions.reduce((s, l) => s + (l.duration || 0), 0);
          
          return `
            <tr class="history-subject-row">
                <td colspan="3" style="padding-left: 30px;">
                    <span class="history-subject-badge">${subName}</span> 
                    <span style="opacity:0.6; font-size: 0.75rem; margin-left: 8px;">(${sessions.length} Sessions)</span>
                </td>
                <td style="font-weight:700; color:var(--accent-blue); text-align:right; padding-right:20px;">${subHours.toFixed(2)}h</td>
                <td></td>
            </tr>
            ${sessions.map(log => {
              const duration = log.duration || 0;
              return `
                <tr class="history-session-detail" style="background: rgba(255,255,255,0.01);">
                    <td style="border-left: 2px solid rgba(52, 152, 219, 0.3); padding: 12px 0 12px 25px; opacity: 0.5; font-size: 0.7rem; white-space: nowrap; vertical-align: top;">
                      <div style="font-size: 0.6rem; letter-spacing: 1px; margin-bottom: 2px;">IDENTIFIER</div>
                      SESSION ${log.session_number || 1}
                    </td>
                    <td style="padding: 12px 10px; vertical-align: top;">
                        <div style="font-size: 0.6rem; opacity: 0.4; letter-spacing: 1px; margin-bottom: 2px;">MISSION TIME</div>
                        <div style="color:var(--text-secondary); font-size:0.85rem; font-weight: 500; white-space:nowrap;">
                            ${log.start_at ? formatTime12h(log.start_at) : '?'} - ${formatTime12h(log.end_at)}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--accent-blue); font-weight: 700; margin-top: 4px;">
                           ${duration.toFixed(2)} HOURS
                        </div>
                    </td>
                    <td colspan="2" class="session-log-note" style="padding: 12px 10px; vertical-align: top;">
                        <div style="font-size: 0.6rem; opacity: 0.4; letter-spacing: 1px; margin-bottom: 2px;">MISSION REFLECTION</div>
                        <div style="font-size: 0.85rem; font-style: italic; opacity: 0.8; line-height: 1.4;">
                          "${log.note && log.note !== 'null' ? log.note : 'No Operative Reflection Recorded'}"
                        </div>
                    </td>
                    <td></td>
                </tr>
              `;
            }).join('')}
          `;
      }).join('');

      return `
        <tr class="history-date-group">
            <td style="white-space:nowrap; font-weight:800; color: #fff;">
                <span class="history-chevron">▶</span>${displayDate}
            </td>
            <td style="color:var(--text-secondary); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px;">${dayData.session_count} MISSIONS</td>
            <td></td>
            <td style="font-weight:800; color:var(--accent-blue); font-size: 1.1rem; text-align:right; padding-right:20px;">${dayData.total_hours.toFixed(2)}h</td>
            <td></td>
        </tr>
        <tr class="history-details-container">
            <td colspan="5" style="padding: 0;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <colgroup>
                        <col style="width: 18%;">
                        <col style="width: 27%;">
                        <col style="width: 45%;">
                        <col style="width: 5%;">
                        <col style="width: 5%;">
                    </colgroup>
                    ${detailsHtml}
                </table>
            </td>
        </tr>
      `;
  }).join('');

  // ⚡ BIND DRILL-DOWN LISTENERS
  document.querySelectorAll('.history-date-group').forEach(group => {
      group.addEventListener('click', () => {
          group.classList.toggle('active');
          const chevron = group.querySelector('.history-chevron');
          if (chevron) {
              chevron.textContent = group.classList.contains('active') ? '▼' : '▶';
          }
      });
  });
}

/** Decommissioned: Legacy Migration Engine (Successor: Direct-to-Cloud Pipeline) */
