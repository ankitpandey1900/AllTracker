import { STORAGE_KEYS } from '@/config/constants';
import { obfuscate, deobfuscate } from '@/utils/security';
import { getCurrentUserId } from '@/services/auth.service';
import { applyThemeToDOM, applyTimerStyleToDOM } from '@/state/app-state';

/**
 * DATA STORAGE ENGINE
 * 
 * Handles all low-level localStorage operations and encryption.
 */

export function saveLocal(key: string, data: any): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadLocal<T>(key: string): T | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try { return JSON.parse(saved) as T; } catch { return null; }
}

export function removeLocal(key: string): void {
  localStorage.removeItem(key);
}

export function saveSecuredSettings(settings: any): void {
  const syncId = getCurrentUserId() || '';
  const secured = { 
    ...settings, 
    groqApiKey: settings.groqApiKey ? obfuscate(settings.groqApiKey, syncId) : '' 
  };
  saveLocal(STORAGE_KEYS.SETTINGS, secured);
}

export function loadSecuredSettings(): any | null {
  const settings = loadLocal<any>(STORAGE_KEYS.SETTINGS);
  if (!settings) return null;
  
  if (settings.groqApiKey) {
    const syncId = getCurrentUserId() || '';
    settings.groqApiKey = deobfuscate(settings.groqApiKey, syncId);
  }
  
  if (settings.theme) {
    applyThemeToDOM(settings.theme);
    applyTimerStyleToDOM(settings.timerStyle);
  }
  return settings;
}

export function updateLocalTimestamp(key: string, timestamp?: string): void {
  const meta = loadLocal<any>(STORAGE_KEYS.SYNC_METADATA) || {};
  meta[key] = timestamp || new Date().toISOString();
  saveLocal(STORAGE_KEYS.SYNC_METADATA, meta);
}

export function getLocalTimestamp(key: string): number {
  const meta = loadLocal<any>(STORAGE_KEYS.SYNC_METADATA) || {};
  const ts = meta[key] || '1970-01-01T00:00:00.000Z';
  return new Date(ts).getTime();
}
