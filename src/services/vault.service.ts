import { apiRequest } from "@/services/api.service";
import type { TrackerDay, Settings } from "@/types/tracker.types";
import type { StudyTask } from "@/types/task.types";
import type { RoutineItem, RoutineHistory } from "@/types/routine.types";
import type { Bookmark } from "@/types/bookmark.types";
import type { ActiveTimer } from "@/types/timer.types";
import type { GlobalProfile, StudySession } from "@/types/profile.types";
import { getCurrentUserId } from "@/services/auth.service";
import { log } from "@/utils/logger.utils";

type VaultResponse<T> = { data: T; updatedAt: string | null };

async function getVault<T>(vault: string): Promise<VaultResponse<T> | null> {
  if (!getCurrentUserId()) return null;
  return apiRequest<VaultResponse<T>>(`/api/app/vault/${vault}`);
}

async function putVault(vault: string, data: unknown): Promise<void> {
  if (!getCurrentUserId()) return;
  await apiRequest(`/api/app/vault/${vault}`, {
    method: "PUT",
    body: { data },
  });
}

export const SyncIndicator = {
  update(status: "syncing" | "synced" | "error" | "offline"): void {
    const el = document.getElementById("syncStatus");
    const hudIcon = document.getElementById("timerSyncStatus");

    const config: Record<string, { text: string; color: string; isLive: boolean }> = {
      syncing: { text: "Syncing...", color: "#3498db", isLive: true },
      synced: { text: "Synced", color: "#2ecc71", isLive: true },
      error: { text: "Sync Error", color: "#e74c3c", isLive: false },
      offline: { text: "Offline", color: "#f39c12", isLive: false },
    };

    const current = config[status];

    if (el) {
      el.textContent = current.text;
      el.style.color = current.color;
    }

    if (hudIcon) {
      hudIcon.classList.toggle("sync-live", current.isLive);
      hudIcon.classList.toggle("sync-offline", !current.isLive);
      hudIcon.title = current.text;
    }
  },
};

export function updateSyncStatus(
  status: "syncing" | "synced" | "error" | "offline",
): void {
  SyncIndicator.update(status);
}

export async function saveTrackerDataCloud(data: TrackerDay[]): Promise<void> {
  await putVault("tracker", data);
}

export async function loadTrackerDataCloud(): Promise<VaultResponse<TrackerDay[]> | null> {
  return getVault<TrackerDay[]>("tracker");
}

export async function saveSettingsCloud(settings: Settings): Promise<void> {
  await putVault("settings", settings);
}

export async function loadSettingsCloud(): Promise<VaultResponse<Settings> | null> {
  return getVault<Settings>("settings");
}

export async function saveRoutinesCloud(routines: RoutineItem[]): Promise<void> {
  await putVault("routines", routines);
}

export async function loadRoutinesCloud(): Promise<VaultResponse<RoutineItem[]> | null> {
  return getVault<RoutineItem[]>("routines");
}

export async function saveBookmarksCloud(bookmarks: Bookmark[]): Promise<void> {
  await putVault("bookmarks", bookmarks);
}

export async function loadBookmarksCloud(): Promise<VaultResponse<Bookmark[]> | null> {
  return getVault<Bookmark[]>("bookmarks");
}

export async function saveRoutineHistoryCloud(history: RoutineHistory): Promise<void> {
  await putVault("history", history);
}

export async function loadRoutineHistoryCloud(): Promise<VaultResponse<RoutineHistory> | null> {
  return getVault<RoutineHistory>("history");
}

export async function saveTimerStateCloud(state: ActiveTimer): Promise<void> {
  await putVault("timer", state);
}

export async function loadTimerStateCloud(): Promise<VaultResponse<ActiveTimer> | null> {
  return getVault<ActiveTimer>("timer");
}

// Routine reset is handled in settings/history storage.

export async function saveTasksCloud(tasks: StudyTask[]): Promise<void> {
  await putVault("tasks", tasks);
}

export async function loadTasksCloud(): Promise<VaultResponse<StudyTask[]> | null> {
  return getVault<StudyTask[]>("tasks");
}

export function subscribeToRealtimeTelemetry(
  callback: (payload: any) => void,
): { unsubscribe: () => void } {
  let lastFingerprint = "";
  const intervalId = window.setInterval(async () => {
    try {
      const [telemetry, leaderboard] = await Promise.all([
        fetchGlobalTelemetry(),
        fetchLeaderboard(),
      ]);
      const fingerprint = JSON.stringify({ telemetry, leaderboard });
      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        callback({ eventType: "UPDATE", new: { fingerprint } });
      }
    } catch (error) {
      log.error("Leaderboard polling failed", error);
    }
  }, 6000);

  return {
    unsubscribe: () => window.clearInterval(intervalId),
  };
}

export async function subscribeToUserDataSync(
  callback: (payload: any) => void,
): Promise<{ unsubscribe: () => void }> {
  let lastFingerprint = "";
  const intervalId = window.setInterval(async () => {
    if (!getCurrentUserId()) return;
    try {
      const snapshot = await Promise.all([
        loadTrackerDataCloud(),
        loadSettingsCloud(),
        loadRoutinesCloud(),
        loadRoutineHistoryCloud(),
        loadBookmarksCloud(),
        loadTasksCloud(),
        loadTimerStateCloud(),
      ]);
      const fingerprint = JSON.stringify(snapshot);
      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        callback({
          table: "__poll__",
          eventType: "UPDATE",
          new: { data: snapshot },
        });
      }
    } catch (error) {
      log.error("User data polling failed", error);
    }
  }, 12000);

  return {
    unsubscribe: () => window.clearInterval(intervalId),
  };
}

export async function broadcastGlobalStats(
  profile: Partial<GlobalProfile>,
): Promise<void> {
  if (!getCurrentUserId()) return;
  await apiRequest("/api/app/broadcast", {
    method: "POST",
    body: profile,
    keepalive: true,
  });
}

export async function logStudySessionCloud(
  duration: number,
  subject: string,
  startTime?: Date,
  note?: string,
): Promise<void> {
  if (!getCurrentUserId()) {
    // 🛡️ OFFLINE FALLBACK: Save to local history if not logged in
    const localSaved = localStorage.getItem('all_tracker_history');
    const localLogs: StudySession[] = localSaved ? JSON.parse(localSaved) : [];
    localLogs.push({
      id: crypto.randomUUID(),
      user_id: 'local-session', // Offline placeholder
      duration,
      subject,
      start_at: startTime?.toISOString() || new Date().toISOString(),
      end_at: new Date().toISOString(),
      note: note || '',
      log_date: (startTime || new Date()).toISOString().split('T')[0]
    });
    localStorage.setItem('all_tracker_history', JSON.stringify(localLogs));
    return;
  }

  const response = await apiRequest<StudySession>("/api/app/study-sessions", {
    method: "POST",
    body: {
      duration,
      subject,
      startAt: startTime?.toISOString(),
      note,
    },
  });

  // 🛰️ CLOUD MIRROR: Update local cache immediately so dashboard is instant
  if (response) {
    const localSaved = localStorage.getItem('all_tracker_history');
    const localLogs: StudySession[] = localSaved ? JSON.parse(localSaved) : [];
    localLogs.push(response);
    localStorage.setItem('all_tracker_history', JSON.stringify(localLogs.slice(-100))); // Keep last 100 locally
  }
}

export async function deleteStudySessionCloud(sessionId: string): Promise<void> {
  if (!getCurrentUserId()) return;
  await apiRequest(`/api/app/study-sessions`, {
    method: "DELETE",
    body: { id: sessionId },
  });
}

export async function updateStudySessionCloud(
  sessionId: string,
  payload: { duration: number; subject: string; note: string }
): Promise<void> {
  if (!getCurrentUserId()) return;
  await apiRequest(`/api/app/study-sessions`, {
    method: "PATCH",
    body: { id: sessionId, ...payload },
  });
}

export async function migrateLocalHistoryToCloud(
  logs: any[],
): Promise<{ success: boolean; count: number }> {
  if (!logs.length) {
    return { success: true, count: 0 };
  }

  let count = 0;
  for (const log of logs) {
    await logStudySessionCloud(
      Number(log.duration || 0),
      log.categoryName || log.subject || "LEGACY",
      log.date ? new Date(log.date) : undefined,
      log.note || log.notes || "",
    );
    count += 1;
  }

  return { success: true, count };
}

export async function fetchMySessionsCloud(): Promise<StudySession[]> {
  if (!getCurrentUserId()) return [];
  return apiRequest<StudySession[]>("/api/app/study-sessions");
}

export async function fetchLeaderboard(): Promise<GlobalProfile[]> {
  return apiRequest<GlobalProfile[]>("/api/app/leaderboard");
}

export async function loadUserProfileCloud(): Promise<GlobalProfile | null> {
  if (!getCurrentUserId()) return null;

  const profile = await apiRequest<any>("/api/app/profile");
  return {
    sync_id: profile.authUserId,
    display_name: profile.username,
    User_name: profile.fullName || "",
    dob: profile.metadata?.dob || "",
    nation: profile.nation || "Global",
    total_hours: Number(profile.totalHours || 0),
    today_hours: Number(profile.todayHours || 0),
    current_rank: profile.rank || "IRON",
    is_focusing_now: profile.isFocusing === true,
    last_active: profile.lastActive || new Date().toISOString(),
    avatar: profile.avatar || "👤",
    current_focus_subject: profile.focusSubject || null,
    phone_number: profile.metadata?.phoneNumber || "",
    is_public: profile.metadata?.isPublic !== false,
    is_focus_public: profile.metadata?.isFocusPublic !== false,
    email: profile.email || "",
    is_online: true,
  };
}

// Profile Management

export async function isUsernameTaken(
  username: string,
  _excludeSyncId?: string | null,
): Promise<boolean> {
  if (!getCurrentUserId()) return false;
  const response = await apiRequest<{ taken: boolean }>(
    `/api/app/profile-availability?username=${encodeURIComponent(username)}`,
  );
  return response.taken;
}

// Telemetry

export async function fetchGlobalTelemetry(): Promise<{
  total_pilots: number;
  active_now: number;
  global_hours_today: number;
  total_platform_hours: number;
  nations_active: number;
} | null> {
  try {
    return await apiRequest("/api/app/telemetry");
  } catch (error) {
    log.error("Global telemetry fetch failed", error);
    return null;
  }
}

// ─── Maamu Chat API ──────────────────────────────────────────────────────────
// Chat sessions are stored in maamu_conversations + maamu_messages tables,
// NOT in user_settings.

export async function loadMaamuSessions(): Promise<any[]> {
  if (!getCurrentUserId()) return [];
  try {
    return await apiRequest<any[]>("/api/app/maamu");
  } catch (error) {
    log.error("Maamu sessions load failed", error);
    return [];
  }
}

export async function createMaamuSession(title: string = 'New Chat'): Promise<any | null> {
  if (!getCurrentUserId()) return null;
  return apiRequest<any>("/api/app/maamu", {
    method: "POST",
    body: { action: "create_session", title },
  });
}

export async function addMaamuMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
): Promise<any | null> {
  if (!getCurrentUserId()) return null;
  return apiRequest<any>("/api/app/maamu", {
    method: "POST",
    body: { action: "add_message", conversationId, role, content },
  });
}

export async function deleteMaamuSession(conversationId: string): Promise<void> {
  if (!getCurrentUserId()) return;
  await apiRequest("/api/app/maamu", {
    method: "POST",
    body: { action: "delete_session", conversationId },
  });
}

export async function renameMaamuSession(conversationId: string, title: string): Promise<void> {
  if (!getCurrentUserId()) return;
  await apiRequest("/api/app/maamu", {
    method: "POST",
    body: { action: "rename_session", conversationId, title },
  });
}
