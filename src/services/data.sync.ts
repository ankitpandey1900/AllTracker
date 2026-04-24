import { STORAGE_KEYS } from '@/config/constants';
import { getLocalTimestamp, updateLocalTimestamp } from './data.storage';

/**
 * DATA SYNC ENGINE
 * 
 * Handles conflict resolution and timestamp comparisons.
 */

export function isCloudNewer(key: string, cloudTimestamp: string | null): boolean {
  if (!cloudTimestamp) return false;
  const localTs = getLocalTimestamp(key);
  const cloudTs = new Date(cloudTimestamp).getTime();
  return cloudTs > localTs;
}

export function isDifferent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export function isLocalEmpty(data: any): boolean {
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object' && data !== null) return Object.keys(data).length === 0;
  return !data;
}
