/**
 * Helpers for "Vault Masking"
 * 
 * NOTE: This just hides text (like IDs) from being easily read in the 
 * browser's DevTools or regular UI. It's not heavy-duty encryption.
 */

const V_PREFIX = 'v1_esc_'; // Unique prefix for identifying secured strings

/** Mask a string so it's not plain-text anymore */
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

/** Takes a masked string and turns it back to normal */
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
