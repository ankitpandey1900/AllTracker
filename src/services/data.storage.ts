import { STORAGE_KEYS } from '@/config/constants';


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

export function saveSecuredSettings(_settings: any): void {
  removeLocal(STORAGE_KEYS.SETTINGS);
}

export function loadSecuredSettings(): any | null {
  removeLocal(STORAGE_KEYS.SETTINGS);
  return null;
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
