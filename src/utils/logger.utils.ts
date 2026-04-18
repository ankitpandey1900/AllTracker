/**
 * Tactical Logger Utility
 * 
 * Provides professional, level-based console logging.
 * Enable advanced debugging: localStorage.setItem('ALL_TRACKER_LOG_LEVEL', 'DEBUG')
 */

type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

const getLogLevel = (): number => {
  const saved = localStorage.getItem('ALL_TRACKER_LOG_LEVEL') as LogLevel;
  if (saved && LOG_LEVELS[saved] !== undefined) return LOG_LEVELS[saved];
  return localStorage.getItem('ALL_TRACKER_DEBUG') === 'true' ? 1 : 2; // Default to INFO (2) or DEBUG (1)
};

const threshold = getLogLevel();

function format(level: LogLevel, msg: string, emoji: string): string {
  const time = new Date().toLocaleTimeString([], { hour12: false });
  return `[${time}] ${emoji} ${level}: ${msg}`;
}

export const log = {
  trace: (msg: string, data?: any) => {
    if (threshold <= LOG_LEVELS.TRACE) console.debug(format('TRACE', msg, '🔍'), data || '');
  },
  debug: (msg: string, data?: any) => {
    if (threshold <= LOG_LEVELS.DEBUG) console.debug(format('DEBUG', msg, '🐛'), data || '');
  },
  info: (msg: string, emoji: string = '🔹') => {
    if (threshold <= LOG_LEVELS.INFO) console.log(format('INFO', msg, emoji));
  },
  success: (msg: string) => {
    if (threshold <= LOG_LEVELS.INFO) console.log(format('INFO', msg, '✅'));
  },
  warn: (msg: string) => {
    if (threshold <= LOG_LEVELS.WARN) console.warn(format('WARN', msg, '⚠️'));
  },
  error: (msg: string, err?: any) => {
    if (threshold <= LOG_LEVELS.ERROR) console.error(format('ERROR', msg, '❌'), err || '');
  }
};
