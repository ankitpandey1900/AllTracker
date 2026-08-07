import { appState } from '@/state/app-state';
import type { ChatSession } from '@/types/tracker.types';
import { formatDuration } from '@/utils/date.utils';
import { getRankTitle } from '@/utils/rank.utils';
import { getCurrentUserLeaderboardContext } from '@/features/dashboard/leaderboard';
import {
  createMaamuSession,
  addMaamuMessage,
  deleteMaamuSession,
  loadMaamuSessions,
} from '@/services/vault.service';
import { 
  calculatePeakHour, 
  calculateSustainability, 
  calculateDisciplineTrend, 
  calculateTaskHealth, 
  calculateRoutineConsistency, 
  calculateMomentum, 
  identifyVulnerableDay, 
  checkTopicAttention 
} from './intelligence.analytics';
import { generateMentorAdvice, generateActionPlan, buildDeepContextJSON } from './intelligence.prompts';

export interface TacticalBriefing {
  peakHour: number;
  peakHourStr: string;
  vulnerableDay: string;
  neglectedTopic: string | null;
  insight: string;
  recommendation: string;
  momentum: number;
  momentumLabel: string;
  strategicContext: string[];
  taskHealth: any;
  routineConsistency: number;
  disciplineTrend: number;
  sustainabilityScore: number;
  mentorMessage: string;
  mentorPersona: string;
  actionPlan: any[];
}

export function getTacticalBriefing(): TacticalBriefing {
  const logs: any[] = []; // Replaced by fetchMySessionsCloud elsewhere if needed
  const trackerData = appState.trackerData || [];
  const tasks = appState.tasks || [];
  const routines = appState.routines || [];
  const routineHistory = appState.routineHistory || {};

  const peakHour = calculatePeakHour(logs);
  const peakHourStr = formatHour(peakHour);
  const vulnerableDay = identifyVulnerableDay(trackerData);
  const neglectedTopic = checkTopicAttention(trackerData);
  const momentumData = calculateMomentum(trackerData);
  const taskHealth = calculateTaskHealth(tasks);
  const routineConsistency = calculateRoutineConsistency(routines);
  const disciplineTrend = calculateDisciplineTrend(routineHistory, routines);
  const sustainabilityScore = calculateSustainability(logs);
  
  const context = getStrategicContext(trackerData, taskHealth, routineConsistency, sustainabilityScore);
  const { message, persona } = generateMentorAdvice(taskHealth, sustainabilityScore, disciplineTrend, momentumData.value, vulnerableDay, neglectedTopic);

  return {
    peakHour,
    peakHourStr,
    vulnerableDay: vulnerableDay || 'None',
    neglectedTopic,
    insight: `Peak window: ${peakHourStr}. ${vulnerableDay ? `Consistency drops on ${vulnerableDay}s.` : ''}`,
    recommendation: neglectedTopic ? `Focus on ${neglectedTopic} during your ${peakHourStr} peak.` : `Maintain your ${peakHourStr} momentum.`,
    momentum: momentumData.value,
    momentumLabel: momentumData.label,
    strategicContext: context,
    taskHealth,
    routineConsistency,
    disciplineTrend,
    sustainabilityScore,
    mentorMessage: message,
    mentorPersona: persona,
    actionPlan: generateActionPlan(tasks, neglectedTopic, peakHourStr)
  };
}

export function getTacticalBriefingString(): string {
  const briefing = getTacticalBriefing();
  const totalHours = (appState.trackerData || []).reduce((sum, day) => sum + (day.studyHours || []).reduce((s, h) => s + (h || 0), 0), 0);
  
  return buildDeepContextJSON({
    username: localStorage.getItem('tracker_username') || "New Participant",
    totalHours,
    rank: getRankTitle(totalHours),
    briefing,
    trackerData: appState.trackerData,
    tasks: appState.tasks,
    routines: appState.routines,
    activeTimer: appState.activeTimer,
    beastModeActive: !!appState.settings.beastMode,
    leaderboard: getCurrentUserLeaderboardContext()
  });
}

export function getStrategicContext(data: any[], taskHealth: any, routine: number, sustainability: number): string[] {
  const totalHours = data.reduce((sum, day) => sum + (day.studyHours || []).reduce((a: number, b: number) => a + (b || 0), 0), 0);
  return [
    `Sustainability: ${sustainability}%`,
    `Task Debt: ${taskHealth.debtScore}%`,
    `Routine: ${routine}%`,
    `Total Study: ${formatDuration(totalHours) || '0h'}`
  ];
}

export function getHabitPulse(): string {
  const briefing = getTacticalBriefing();
  if (briefing.routineConsistency > 90) return "Exceptional Habit Fidelity. God-Tier status.";
  if (briefing.routineConsistency > 70) return "Operational Stability Confirmed.";
  return "Systemic Discipline Failure. Prioritize Easy Wins.";
}

function formatHour(h: number): string {
  const hr = h % 12 || 12;
  return `${hr}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

// ─── Session Management ──────────────────────────────────
const MAAMU_STORAGE_KEY = 'maamu_local_sessions';
let maamuSessions: ChatSession[] = [];
let maamuActiveId: string = '';

try {
  const cached = localStorage.getItem(MAAMU_STORAGE_KEY);
  if (cached) {
    maamuSessions = JSON.parse(cached);
    if (maamuSessions.length > 0) maamuActiveId = maamuSessions[0].id;
  }
} catch (e) {
  console.warn("Failed to load maamu sessions from local storage", e);
}

export function saveSessionsLocally() {
  try {
    localStorage.setItem(MAAMU_STORAGE_KEY, JSON.stringify(maamuSessions));
  } catch (e) {
    console.warn("Failed to save maamu sessions to local storage", e);
  }
}

export async function loadMaamuSessionsIntoState(): Promise<void> {
  const sessions = await loadMaamuSessions();
  if (sessions && sessions.length > 0) {
    maamuSessions = sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      messages: s.messages || [],
      createdAt: s.createdAt,
      lastActive: s.lastActive,
      pinned: s.pinned,
    }));
    if (!maamuActiveId && maamuSessions.length > 0) maamuActiveId = maamuSessions[0].id;
    saveSessionsLocally();
  }
}

export function getChatSessions(): ChatSession[] { return maamuSessions; }
export function getActiveSession(): ChatSession | null { return maamuSessions.find(s => s.id === maamuActiveId) || maamuSessions[0] || null; }

export async function createNewSession(title: string = 'New Chat'): Promise<string | null> {
  const created = await createMaamuSession(title).catch(() => null);
  if (!created) {
    import('@/utils/dom.utils').then(({ showToast }) => showToast("Failed to start new mission. Network unstable.", "error"));
    return null;
  }
  const session: ChatSession = { id: created.id, title: created.title, messages: [], createdAt: created.createdAt, lastActive: created.lastActive };
  maamuSessions.unshift(session);
  maamuActiveId = session.id;
  saveSessionsLocally();
  return session.id;
}

export async function deleteSession(id: string): Promise<void> {
  await deleteMaamuSession(id).catch(err => console.error('Maamu delete API failed:', err));
  maamuSessions = maamuSessions.filter(s => s.id !== id);
  if (maamuActiveId === id) maamuActiveId = maamuSessions[0]?.id || '';
  saveSessionsLocally();
}

export function switchSession(id: string): void {
  maamuActiveId = id;
  const session = getActiveSession();
  if (session) session.lastActive = Date.now();
  saveSessionsLocally();
}

export async function persistMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
  const session = maamuSessions.find(s => s.id === conversationId);
  if (session) {
    session.messages.push({ role, content, timestamp: Date.now() });
    session.lastActive = Date.now();
    saveSessionsLocally();
  }
  addMaamuMessage(conversationId, role, content).catch(err => console.error('Maamu persist failed:', err));
}
