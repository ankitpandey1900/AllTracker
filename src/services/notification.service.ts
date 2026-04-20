import { log } from '@/utils/logger.utils';

/**
 * Tactical Notification Service
 * 
 * Manages browser notifications and tactical audio alerts.
 */
class NotificationService {
  private chime: HTMLAudioElement | null = null;
  private soundPath = '/All Tracker Notification Sound.mp3';

  constructor() {
    if (typeof window !== 'undefined') {
      this.chime = new Audio(this.soundPath);
      this.chime.preload = 'auto';
    }
  }

  /** Request permission to send notifications */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      log.warn('Notifications not supported by this browser.');
      return false;
    }

    if (Notification.permission === 'granted') return true;
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /** 
   * Dispatches a tactical alert.
   * If the tab is hidden, it uses a browser notification.
   * Always plays the tactical chime.
   */
  async sendAlert(title: string, body: string): Promise<void> {
    // 1. Play Tactical Chime
    this.playChime();

    // 2. Send Browser Notification if permitted and hidden
    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const options = {
          body,
          icon: '/logo.png',
          badge: '/favicon-48x48.png', // Small monochrome icon for mobile status bar
          vibrate: [200, 100, 200],
          tag: 'timer-alert', // Overwrite previous timer alerts
          renotify: true,
          data: {
            url: window.location.origin
          }
        };

        if (registration) {
          registration.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } catch (err) {
        log.error('Failed to dispatch notification:', err);
      }
    }
  }

  /** Plays the loaded tactical chime */
  playChime(): void {
    if (!this.chime) return;
    
    try {
      this.chime.currentTime = 0;
      this.chime.play().catch(err => {
        log.warn('Audio playback blocked by browser. User interaction required.');
      });
    } catch (err) {
      log.error('Audio playback error:', err);
    }
  }
}

export const notificationService = new NotificationService();
