/**
 * Line icons for achievement badges, one consistent set (24×24 grid,
 * 1.8 stroke, round caps). They use currentColor, so unlocked badges take
 * the accent colour and locked ones go quiet, and they look the same on
 * every device (emoji don't).
 */

const PATHS: Record<string, string> = {
  // Momentum Builder: flame
  streak_3: '<path d="M12 3c.6 3.2 4.5 5.1 4.5 9.6a4.5 4.5 0 0 1-9 0c0-2.2 1.1-3.6 2.3-4.6.1 1.7 1 2.8 2.2 3 .3-2.8-.9-4.9 0-8Z"/>',
  // Getting Serious: open book
  hours_10: '<path d="M3.5 5.5c2.6-.9 5.6-.7 8.5 1v13c-2.9-1.7-5.9-1.9-8.5-1Z"/><path d="M20.5 5.5c-2.6-.9-5.6-.7-8.5 1v13c2.9-1.7 5.9-1.9 8.5-1Z"/>',
  // Weekend Warrior: calendar with a tick
  weekend_warrior: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  // Strategic Rest: moon
  iron_will: '<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1Z"/>',
  // Unstoppable: lightning bolt
  streak_7: '<path d="M13 2.8 5 13.5h6.2L10.5 21l8-10.7h-6.2Z"/>',
  // Problem Solver: target
  problem_solver: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.9" fill="currentColor"/>',
  // Consistency King: crown
  streak_14: '<path d="M3.5 8.5 8 12.5l4-6.5 4 6.5 4.5-4-1.8 10H5.3Z"/><path d="M6 21h12"/>',
  // Deep Dive: waves
  hours_50: '<path d="M3 9c1.5 0 1.5-1.5 3-1.5S7.5 9 9 9s1.5-1.5 3-1.5S13.5 9 15 9s1.5-1.5 3-1.5S19.5 9 21 9"/><path d="M3 14c1.5 0 1.5-1.5 3-1.5S7.5 14 9 14s1.5-1.5 3-1.5S13.5 14 15 14s1.5-1.5 3-1.5S19.5 14 21 14"/><path d="M3 19c1.5 0 1.5-1.5 3-1.5S7.5 19 9 19s1.5-1.5 3-1.5S13.5 19 15 19s1.5-1.5 3-1.5S19.5 19 21 19"/>',
  // Overachiever: rocket
  overachiever: '<path d="M12 2.8c3 2.2 4.6 5.8 4.6 9.7l-2 3.3H9.4l-2-3.3c0-3.9 1.6-7.5 4.6-9.7Z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M9.5 18.5 8 21.2M14.5 18.5l1.5 2.7M12 18.8v2.6"/>',
  // Code Warrior: sword
  streak_30: '<path d="M4 4h3.5L17 13.5 13.5 17 4 7.5Z"/><path d="m12 18.5 6.5-6.5M16.5 16.5 20 20"/>',
  // Algorithm Master: connected nodes
  problems_100: '<circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M8.3 6h7.4M7.1 8l3.8 7.9M16.9 8l-3.8 7.9"/>',
  // Mastery Path: graduation cap
  hours_100: '<path d="m2.5 9.5 9.5-5 9.5 5-9.5 5Z"/><path d="M6.5 11.7v4.6c0 1.5 2.5 2.9 5.5 2.9s5.5-1.4 5.5-2.9v-4.6M21.5 9.5v5.5"/>',
  // Unbroken: diamond
  streak_50: '<path d="M6.5 3.5h11l3.5 5.5L12 20.5 3 9Z"/><path d="M3 9h18M9.5 3.5 8 9l4 11.5L16 9l-1.5-5.5"/>',
  // Dedicated: light bulb
  hours_250: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z"/>',
  // Centennial: trophy
  streak_100: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0Z"/><path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5Z"/>',
  // Consistent Coder: code brackets
  problems_500: '<path d="m8 7.5-4.5 4.5L8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.8 5l-3.6 14"/>',
  // Elite Status: medal
  hours_500: '<circle cx="12" cy="15" r="5.5"/><path d="M8.6 10.7 6 3h4.2L12 7.3 13.8 3H18l-2.6 7.7"/><path d="m12 12.6.9 1.7 1.9.3-1.4 1.3.3 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.3 1.9-.3Z"/>',
  // Living Legend: infinity
  hours_1000: '<path d="M7.2 8.2a3.8 3.8 0 1 0 0 7.6c3.2 0 6.4-7.6 9.6-7.6a3.8 3.8 0 1 1 0 7.6c-3.2 0-6.4-7.6-9.6-7.6Z"/>',
};

const FALLBACK = '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.5 7.5 5-2.5 5 2.5-1.5-7.5"/>';

/** Inline SVG for a badge. Colour comes from the surrounding text colour. */
export function badgeIcon(id: string, size = 28): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[id] || FALLBACK}</svg>`;
}
