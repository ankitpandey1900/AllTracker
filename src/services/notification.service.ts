import { log } from '@/utils/logger.utils';

/**
 * Tactical Notification Service
 * 
 * Manages browser notifications, tactical audio alerts, 
 * and immersive ambient focus sounds.
 */
class NotificationService {
  private chime: HTMLAudioElement | null = null;
  private ambientAudio: HTMLAudioElement | null = null;
  
  private chimePath = '/All Tracker Notification Sound.mp3';
  private currentAmbientType: string = 'none';
  private isMuted: boolean = false;
  private preMuteVolume: number = 0.5;

  private ambientManifest: Record<string, string> = {
    'interstellar': '/interstellar.mp3'
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.chime = new Audio(this.chimePath);
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
          badge: '/favicon-48x48.png', 
          vibrate: [200, 100, 200],
          tag: 'timer-alert', 
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
      this.chime.play().catch(() => {
        log.warn('Audio playback blocked by browser. User interaction required.');
      });
    } catch (err) {
      log.error('Audio playback error:', err);
    }
  }

  // --- Ambient Focus Logic ---

  setAmbientSound(type: 'none' | 'cyber-rain' | 'space-static' | 'interstellar'): void {
    if (this.currentAmbientType === type) return;
    
    this.stopAmbient();
    this.currentAmbientType = type;

    if (type === 'none') {
      this.ambientAudio = null;
      return;
    }

    const path = this.ambientManifest[type];
    if (!path) return;

    this.ambientAudio = new Audio(path);
    this.ambientAudio.loop = true;
    this.ambientAudio.preload = 'auto';
    // Let browser optimize by streaming large files
  }

  setAmbientVolume(volume: number): void {
    if (this.ambientAudio) {
      this.ambientAudio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  startAmbient(): void {
    if (!this.ambientAudio || this.currentAmbientType === 'none') return;
    
    this.ambientAudio.play().catch(err => {
      log.warn(`Ambient audio (${this.currentAmbientType}) playback blocked. User interaction needed.`);
    });
  }

  stopAmbient(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
    }
  }

  getAmbientType(): string {
    return this.currentAmbientType;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ambientAudio) {
      if (this.isMuted) {
        this.preMuteVolume = this.ambientAudio.volume;
        this.ambientAudio.volume = 0;
      } else {
        this.ambientAudio.volume = this.preMuteVolume;
      }
    }
    return this.isMuted;
  }

  getMuteState(): boolean {
    return this.isMuted;
  }
}

export const notificationService = new NotificationService();
