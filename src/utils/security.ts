/**
 * Security utilities for Vault Masking
 * 
 * Note: This is obfuscation (masking), not cryptographical encryption. 
 * Its purpose is to prevent sensitive keys from being visible in plain-text 
 * within the browser's developer tools (Inspect -> Application -> LocalStorage).
 */

const V_PREFIX = 'v1_esc_'; // Unique prefix for identifying secured strings

/** 
 * Obfuscates a string to prevent plain-text DevTools viewing.
 * Strategy: Reverse -> XOR-like shift (dummy) -> Base64 -> Prefix
 */
export function obfuscate(val: string): string {
  if (!val) return '';
  if (val.startsWith(V_PREFIX)) return val; // Already obfuscated

  try {
    // 1. Reverse the string
    const reversed = val.split('').reverse().join('');
    
    // 2. Base64 encode
    const encoded = btoa(unescape(encodeURIComponent(reversed)));
    
    return V_PREFIX + encoded;
  } catch (e) {
    console.error('Obfuscation failure:', e);
    return val; // Fallback to raw to prevent data loss
  }
}

/** 
 * Reverses the obfuscation process.
 * Detects if the string is obfuscated via the prefix.
 */
export function deobfuscate(val: string): string {
  if (!val || !val.startsWith(V_PREFIX)) return val; // It's already raw or legacy

  try {
    const core = val.substring(V_PREFIX.length);
    
    // 1. Decode Base64
    const decoded = decodeURIComponent(escape(atob(core)));
    
    // 2. Reverse back
    return decoded.split('').reverse().join('');
  } catch (e) {
    console.warn('Deobfuscation failure (format mismatch):', e);
    return val; // Fallback to raw to ensure user data remains reachable
  }
}

/**
 * Checks if a string is currently obfuscated.
 */
export function isObfuscated(val: string): boolean {
  return typeof val === 'string' && val.startsWith(V_PREFIX);
}
