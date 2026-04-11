import { appState } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';

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

  // Setup daily check & routine check
  setupStudyReminder();
  setupRoutineAlerts();
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

function setupStudyReminder(): void {
  // Check every hour
  setInterval(() => {
    checkAndNotify();
  }, 1000 * 60 * 60);

  // Also check immediately on load
  setTimeout(checkAndNotify, 5000);
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
          "Mission Alert! ⚡",
          `Your objective "${item.title}" starts in 15 minutes. Prepare for deployment.`
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
  const now = new Date();
  const currentHour = now.getHours();
  
  // Only notify in the evening (8 PM - 10 PM)
  if (currentHour < 20 || currentHour > 22) return;

  const today = new Date().toISOString().split('T')[0];
  const todayData = appState.trackerData.find(d => d.date.startsWith(today));

  if (todayData) {
    const totalHours = (todayData.studyHours || []).reduce((a, b) => a + (b || 0), 0);
    if (totalHours === 0 && !todayData.completed && !todayData.restDay) {
      sendNotification(
        "All Tracker Awaits! 🌌",
        "You haven't logged any progress today. Don't let your streak freeze!"
      );
    }
  }
}

async function sendNotification(title: string, body: string): Promise<void> {
  if (Notification.permission === "granted") {
    const options = {
      body,
      icon: "/pwa-icon.png",
      badge: "/pwa-icon.png",
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
