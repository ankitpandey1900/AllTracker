/**
 * Tactical Logger Utility
 * 
 * Provides professional, stylized console logging that can be toggled via 
 * localStorage.setItem('ALL_TRACKER_DEBUG', 'true')
 */

export const log = {
  info: (msg: string, emoji: string = '📡') => {
    if (localStorage.getItem('ALL_TRACKER_DEBUG') === 'true') {
      console.log(`${emoji} ${msg}`);
    }
  },
  
  success: (msg: string) => {
    if (localStorage.getItem('ALL_TRACKER_DEBUG') === 'true') {
      console.log(`✅ ${msg}`);
    }
  },

  // 🛡️ Always show errors/warnings for security and debugging
  warn: (msg: string) => console.warn(`⚠️ ${msg}`),
  error: (msg: string, err?: any) => console.error(`🚨 ${msg}`, err)
};
