/**
 * Date formatting helpers.
 * 
 * Simple functions to turn raw dates into pretty strings for the UI.
 */

/** Formats a Date as "26 Mar 2026" */
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

/** Formats a Date as "DD/MM/YYYY" */
export function formatDateDMY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Formats a Date as "2:15 PM" */
export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Converts 24h time string "14:30" or ISO string to "2:30 PM" */
export function formatTime12h(time: string): string {
  if (!time) return '--:--';

  // If it's an ISO string (study sessions use toISOString), parse properly
  if (time.includes('T')) {
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  // Handle standard HH:MM format (routines use this)
  const parts = time.split(':');
  if (parts.length < 2) return time;

  const [hours, mins] = parts;
  let h = parseInt(hours);
  if (isNaN(h)) return time;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  // Ensure we only take first 2 digits of mins (handles HH:MM:SS)
  const m = mins.substring(0, 2);
  return `${h}:${m} ${ampm}`;
}

/** Formats milliseconds as "HH:MM:SS" */
export function formatMsToTime(duration: number): string {
  let seconds: string | number = Math.floor((duration / 1000) % 60);
  let minutes: string | number = Math.floor((duration / (1000 * 60)) % 60);
  let hours: string | number = Math.floor(duration / (1000 * 60 * 60));

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  return `${hours}:${minutes}:${seconds}`;
}

/** Generates a timestamp string like "20260326_1430" for filenames */
export function generateExportTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

/** 
 * Returns the current date as an ISO string in LOCAL time (YYYY-MM-DD).
 * Senior Practice: Avoids 'toISOString()' date shifts for daily features.
 */
export function getLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

