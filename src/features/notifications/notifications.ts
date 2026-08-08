import { appState } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import {
  getDailyBriefingMessage,
  getDeedMessage,
  getPeerPressureMessage,
  getRoastNotification,
  getWisdomNotification,
} from './notification-content';
import { fetchLeaderboard } from '@/services/vault.service';
import { apiRequest } from '@/services/api.service';

const TIME_ZONE = 'Asia/Kolkata';
const notifiedRoutineIds = new Set<string>();
let notificationsInitialized = false;

// Night-owl study checkpoints. They only run while the app is open; web push is a
// separate server-side feature and must not be faked by the browser scheduler.
const DAILY_SLOTS = [
  { id: 'late-morning', hour: 10, minute: 0 },
  { id: 'afternoon-start', hour: 13, minute: 0 },
  { id: 'afternoon-reset', hour: 16, minute: 0 },
  { id: 'evening-start', hour: 18, minute: 0 },
  { id: 'prime-time', hour: 20, minute: 0 },
  { id: 'night-sprint', hour: 22, minute: 0 },
  { id: 'midnight-check', hour: 0, minute: 0 },
  { id: 'late-night-push', hour: 2, minute: 0 },
  { id: 'final-call', hour: 4, minute: 30 },
];

type IndiaClock = { date: string; hour: number; minute: number };

function indiaClock(now = new Date()): IndiaClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '0';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  };
}

function sentKey(date: string): string {
  return `all_tracker_notification_slots_${date}`;
}

function getSentSlots(date: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(sentKey(date)) || '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function markSlotSent(date: string, slotId: string): void {
  const slots = getSentSlots(date);
  if (!slots.includes(slotId)) localStorage.setItem(sentKey(date), JSON.stringify([...slots, slotId]));
}

function myName(): string {
  try {
    return JSON.parse(localStorage.getItem('secure_local_profile') || '{}').displayName || 'Operative';
  } catch {
    return 'Operative';
  }
}

export async function initNotifications(): Promise<void> {
  if (!('Notification' in window) || notificationsInitialized) return;
  notificationsInitialized = true;
  syncNotificationUI();
  // Retry after a deployment adds VAPID configuration. A device can have
  // browser permission but still have no PushSubscription.
  if (Notification.permission === 'granted') void subscribeToPush();

  // A short pulse catches scheduled windows even when mobile browsers throttle
  // timers. It does not create notifications after the app is closed.
  setInterval(() => void runNotificationPulse(), 5 * 60 * 1000);
  setInterval(checkRoutineTimers, 60 * 1000);
  setTimeout(() => void runNotificationPulse(), 5_000);
  setTimeout(checkRoutineTimers, 3_000);

  setTimeout(() => {
    if (Notification.permission === 'default' && !sessionStorage.getItem('notif_nagged')) {
      showToast('Enable notifications from Settings if you want Maamu reminders and study alerts.', 'info');
      sessionStorage.setItem('notif_nagged', 'true');
    }
  }, 4_000);
}

export function requestNotificationPermission(): void {
  if (!('Notification' in window)) {
    showToast('Your browser does not support notifications.', 'error');
    return;
  }
  if (Notification.permission === 'granted') {
    void subscribeToPush();
    showToast('Notifications are enabled. Checking background push setup for this device.', 'info');
    return;
  }

  void Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      showToast('Notifications enabled. Maamu will keep the pressure on while the app is open.', 'success');
      syncNotificationUI();
      void subscribeToPush();
      void runNotificationPulse();
    } else if (permission === 'denied') {
      showToast('Notifications are blocked in browser settings. Allow them from the lock icon beside the address bar.', 'error');
    }
  });
}

function vapidPublicKey(): string | undefined {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : undefined;
}

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  const bytes = Uint8Array.from(raw, character => character.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  await apiRequest('/api/app/push', { method: 'POST', body: subscription.toJSON() });
}

async function subscribeToPush(): Promise<void> {
  const publicKey = vapidPublicKey();
  if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('Browser reminders are active. Background push will activate after Web Push is configured.', 'info');
    return;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToArrayBuffer(publicKey),
    });
    await savePushSubscription(subscription);
    showToast('Background notifications are active, even when AllTracker is closed.', 'success');
    syncNotificationUI('Background notifications active');
  } catch (error) {
    console.warn('Web Push subscription failed', error);
    showToast('Browser reminders are active, but background push could not be enabled on this device.', 'info');
  }
}

function syncNotificationUI(label = 'Notifications enabled'): void {
  const btn = document.getElementById('enableNotificationsBtn');
  if (!btn || Notification.permission !== 'granted') return;
  btn.classList.add('notif-active');
  btn.innerHTML = `<span>${label}</span>`;
}

async function runNotificationPulse(): Promise<void> {
  await Promise.all([checkScheduledAlert(), checkActiveChaser()]);
}

async function checkScheduledAlert(): Promise<void> {
  if (Notification.permission !== 'granted') return;
  const now = indiaClock();
  const slot = DAILY_SLOTS.find(item => item.hour === now.hour && now.minute >= item.minute && now.minute < item.minute + 20);
  if (!slot || getSentSlots(now.date).includes(slot.id)) return;

  if (await sendDynamicAlert(now.hour)) markSlotSent(now.date, slot.id);
}

async function checkActiveChaser(): Promise<void> {
  if (Notification.permission !== 'granted' || appState.activeTimer.isRunning) return;
  const key = 'all_tracker_last_chaser_notification';
  const lastAt = Number(localStorage.getItem(key) || 0);
  if (Date.now() - lastAt < 3 * 60 * 60 * 1000) return;

  try {
    const leaderboard = await fetchLeaderboard();
    const name = myName();
    const otherFocusing = leaderboard.find(user => user.is_focusing_now && user.is_focus_public !== false && user.display_name !== name);
    if (!otherFocusing) return;
    const topUser = leaderboard[0]?.display_name || otherFocusing.display_name;
    const message = getPeerPressureMessage(topUser, otherFocusing.display_name, name);
    if (await sendNotification(message.title, message.body)) localStorage.setItem(key, String(Date.now()));
  } catch {
    // Leaderboard availability should never break normal reminders.
  }
}

async function sendDynamicAlert(hour: number): Promise<boolean> {
  const today = indiaClock().date;
  const todayData = appState.trackerData.find(day => day.date === today);
  const totalHours = todayData ? (todayData.studyHours || []).reduce((sum, value) => sum + (value || 0), 0) : 0;

  if (hour === 7) {
    const message = getDailyBriefingMessage();
    return sendNotification(message.title, message.body);
  }

  const categories = appState.settings.columns || [];
  if (categories.length > 0) {
    const recentDays = appState.trackerData.slice(-3);
    const neglected = categories
      .map((category, index) => ({ name: category.name, hours: recentDays.reduce((sum, day) => sum + (day.studyHours[index] || 0), 0) }))
      .find(category => category.hours === 0);
    if (neglected) {
      return sendNotification('Missing in action', `Maamu check: ${neglected.name} has been at 0 for three days. Open it for one proper study block today.`);
    }
  }

  if (totalHours < 2 && hour % 2 === 0) {
    const message = getWisdomNotification();
    return sendNotification(message.title, message.body);
  }

  if (totalHours < 1 || (totalHours < 2.5 && hour % 2 === 1)) {
    const message = getRoastNotification(totalHours);
    return sendNotification(message.title, message.body);
  }

  const message = getDeedMessage(totalHours, hour);
  return sendNotification(message.title, message.body);
}

function checkRoutineTimers(): void {
  const now = new Date();
  const today = indiaClock(now).date;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  appState.routines.forEach(item => {
    if (item.completed || !item.time) return;
    const [hours, minutes] = item.time.split(':').map(Number);
    const remaining = (hours * 60 + minutes) - currentMinutes;
    const key = `${today}-${item.id}`;
    if (remaining > 0 && remaining <= 15 && !notifiedRoutineIds.has(key)) {
      void sendNotification('Routine incoming', `15 minutes until "${item.title}". Maamu says: book kholo, countdown khatam hone ka wait mat karo.`);
      notifiedRoutineIds.add(key);
    }
  });
}

async function sendNotification(title: string, body: string): Promise<boolean> {
  if (Notification.permission !== 'granted') return false;
  const finalTitle = title.replace(/Operative/g, myName());
  const finalBody = body.replace(/Operative/g, myName());
  const options = {
    body: finalBody,
    icon: '/pwa-logo.png',
    badge: '/pwa-logo.png',
    tag: `alltracker-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    renotify: true,
    data: { url: `${window.location.origin}/` },
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(finalTitle, options);
    } else {
      new Notification(finalTitle, options);
    }
    return true;
  } catch (error) {
    console.warn('Notification delivery failed', error);
    return false;
  }
}
