import { appState } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import { getDeedMessage, getPeerPressureMessage, getDailyBriefingMessage } from './notification-content';
import { fetchLeaderboard } from '@/services/vault.service';

/**
 * Handles showing Desktop Notifications.
 * 
 * It asks for permission to send alerts and reminds you to study 
 * if you haven't logged any time today.
 */

// TRACKING: Map to ensure each routine item only triggers one alert per day
const notifiedRoutineIds = new Set<string>();

export async function initNotifications(): Promise<void> {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }

  // Sync UI state
  syncNotificationUI();

  // Setup dynamic deed-checks & routine alerts
  setupStrategicAlerts();
  setupRoutineAlerts();

  // Nag user to enable notifications if they haven't (once per session)
  setTimeout(() => {
    if (Notification.permission !== "granted" && !sessionStorage.getItem('notif_nagged')) {
      showToast("🔔 Important: Enable notifications! Click the lock icon 🔒 next to the web address so we can send you Daily Alerts.", "info");
      sessionStorage.setItem('notif_nagged', 'true');
    }
  }, 4000);
}

export function requestNotificationPermission(): void {
    if (!("Notification" in window)) {
        showToast("Your browser does not support notifications.", "error");
        return;
    }

    // Handled state: Inform user how to toggle browser-level OS APIs.
    if (Notification.permission === "granted") {
        showToast("Notifications are already rolling! To disable, click the lock icon 🔒 next to your URL bar.", "info");
        return;
    }
    
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            showToast("Notifications Enabled! All Tracker will remind you to stay consistent.", "success");
            syncNotificationUI();
        } else if (permission === "denied") {
            showToast("Notifications are blocked in your browser settings. Please allow them manually via the lock icon in your URL bar.", "error");
        }
    });
}

function syncNotificationUI(): void {
  const btn = document.getElementById('enableNotificationsBtn');
  if (!btn) return;

  if (Notification.permission === "granted") {
    btn.classList.add('notif-active');
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.gap = '8px';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>Notifications Active</span>
    `;
  }
}

function setupStrategicAlerts(): void {
  // 1. Tactical Window checks (3 times a day)
  setInterval(() => {
    checkContextualNotifs();
  }, 1000 * 60 * 30); // 30 min pulse

  // 2. 'Active Chaser' check (Periodic competitive taunts)
  setInterval(() => {
    checkActiveChaser();
  }, 1000 * 60 * 45); // 45 min pulse

  // Initial check on load
  setTimeout(() => {
    checkDailyBriefing();
    checkContextualNotifs();
    checkActiveChaser();
  }, 10000);
}

let lastChaserNotifAt = 0;

async function checkActiveChaser(): Promise<void> {
  // Rate limit: Max one chaser notif every 3 hours
  if (Date.now() - lastChaserNotifAt < 1000 * 60 * 60 * 3) return;

  const isUserFocusing = appState.activeTimer.isRunning;
  if (isUserFocusing) return; // Don't taunt if already working!

  try {
    const leaderboard = await fetchLeaderboard();
    const profileRaw = localStorage.getItem('secure_local_profile');
    const myName = profileRaw ? JSON.parse(profileRaw).displayName : null;
    const otherFocusing = leaderboard.find(u => u.is_focusing_now && u.display_name !== myName);
    
    if (otherFocusing) {
      const { title, body } = getPeerPressureMessage(leaderboard[0].display_name, otherFocusing.display_name);
      sendNotification(title, body);
      lastChaserNotifAt = Date.now();
    }
  } catch (e) { /* ignore */ }
}

async function checkDailyBriefing(): Promise<void> {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  const storageKey = 'last_daily_briefing_date';
  
  const lastBriefing = localStorage.getItem(storageKey);
  
  // If it's a new day and we haven't sent it yet today
  if (lastBriefing !== todayStr) {
    const msg = getDailyBriefingMessage();
    await sendNotification(msg.title, msg.body);
    localStorage.setItem(storageKey, todayStr);
  }
}

async function checkContextualNotifs(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  const storageKey = `sent_tactical_notif_${todayStr}`;
  
  const sentNotifs = JSON.parse(localStorage.getItem(storageKey) || '[]');
  
  // Tactical Windows
  let windowLabel: string | null = null;
  if (currentHour >= 5 && currentHour < 12) windowLabel = 'morning';
  else if (currentHour >= 12 && currentHour < 18) windowLabel = 'afternoon';
  else windowLabel = 'evening';

  if (windowLabel && !sentNotifs.includes(windowLabel)) {
    await sendDynamicAlert(windowLabel, currentHour);
    sentNotifs.push(windowLabel);
    localStorage.setItem(storageKey, JSON.stringify(sentNotifs));
  }
}

async function sendDynamicAlert(window: string, hour: number): Promise<void> {
  const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  const todayData = appState.trackerData.find(d => {
    const dDate = new Date(d.date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    return dDate === today;
  });

  const totalHours = todayData ? (todayData.studyHours || []).reduce((a, b) => a + (b || 0), 0) : 0;
  
  // 1. Deed-Based Messaging (Standard)
  const { title, body } = getDeedMessage(totalHours, hour);

  // 2. Peer Pressure Injection (Extra spice)
  let finalTitle = title;
  let finalBody = body;

  try {
    const leaderboard = await fetchLeaderboard();
    if (leaderboard.length > 0) {
      const topUser = leaderboard[0].display_name;
      const focusingNow = leaderboard.find(u => u.is_focusing_now && u.display_name !== 'You')?.display_name;
      
      // 30% chance to swap to a Peer Pressure alert if hours are low
      if (totalHours < 2 && Math.random() < 0.3) {
        const peer = getPeerPressureMessage(topUser, focusingNow);
        finalTitle = peer.title;
        finalBody = peer.body;
      }
    }
  } catch (e) { /* ignore lb fetch errors for notifications */ }

  sendNotification(finalTitle, finalBody);
}

function setupRoutineAlerts(): void {
  // Check every minute for precision
  setInterval(() => {
    checkRoutineTimers();
  }, 1000 * 60);

  // Initial check
  setTimeout(checkRoutineTimers, 3000);
}

function checkRoutineTimers(): void {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  appState.routines.forEach(item => {
    if (item.completed) return;

    const [hours, minutes] = item.time.split(':').map(Number);
    const routineTimeInMinutes = hours * 60 + minutes;
    const diff = routineTimeInMinutes - currentTimeInMinutes;

    // Trigger exactly 15 minutes before
    if (diff === 15) {
      const key = `${todayStr}-${item.id}`;
      if (!notifiedRoutineIds.has(key)) {
        sendNotification(
          "Hogaya aaram? Chalo kaam pe! ⏰",
          `15 mins mein "${item.title}" shuru hone wala hai. Books kholein ya hum aake kholein?`
        );
        notifiedRoutineIds.add(key);
      }
    }
  });

  // Cleanup old keys from different days if the app stays open
  if (notifiedRoutineIds.size > 20) {
    const keys = Array.from(notifiedRoutineIds);
    keys.forEach(k => {
      if (!k.startsWith(todayStr)) notifiedRoutineIds.delete(k);
    });
  }
}

function checkAndNotify(): void {
  // Legacy function replaced by checkContextualNotifs
}

async function sendNotification(title: string, body: string): Promise<void> {
  if (Notification.permission === "granted") {
    const options = {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: title.includes("Mission") ? "routine-alert" : "study-reminder",
      renotify: true
    };

    // 📱 Modern PWA Standard: Must use Service Worker to guarantee delivery on Android/iOS
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          return;
        }
      } catch (e) {
        console.warn('SW Notification failed, falling back...', e);
      }
    }

    // 💻 Fallback for legacy desktop contexts where SW isn't managing pushes
    new Notification(title, options as any);
  }
}
