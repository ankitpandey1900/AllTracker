import { STORAGE_KEYS } from '@/config/constants';

/** 
 * Safely escapes HTML characters to prevent XSS.
 * Industry-standard utility for vanilla JS rendering.
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** 
 * Fetches the local storage profile.
 * Name maintained for backward compatibility.
 */
export function getSecureLocalProfileString(): string | null {
  return localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
}

/** 
 * Saves the profile to local storage.
 * Name maintained for backward compatibility.
 */
export function setSecureLocalProfileString(value: string | null): void {
  if (!value) {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, value);
}
