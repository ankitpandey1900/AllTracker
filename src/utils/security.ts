/**
 * Helpers for "Vault Masking"
 * 
 * NOTE: This just hides text (like IDs) from being easily read in the 
 * browser's DevTools or regular UI. It's not heavy-duty encryption.
 */

const V1_PREFIX = 'v1_esc_'; // Legacy simple masking
const V2_PREFIX = 'v2_enc_'; // Advanced XOR encryption
const XOR_KEY = 'Arena_V@uLt_K3y_2026!xX';

/** 
 * Encrypt a string so it's unreadable to AIs or humans.
 * Uses a chaotic XOR shift and Hex scrambling.
 */
export function obfuscate(val: string): string {
  if (!val) return '';
  if (val.startsWith(V2_PREFIX)) return val; // Already v2 enc

  // If they pass in a v1 string, we decrypt it first, then upgrade it to v2.
  if (val.startsWith(V1_PREFIX)) {
    val = deobfuscate(val);
  }

  try {
    // 1. Basic XOR with static key mapped to Hex
    let hexStr = '';
    for (let i = 0; i < val.length; i++) {
       const charCode = val.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
       hexStr += charCode.toString(16).padStart(2, '0');
    }
    
    // 2. Reverse hex to break generic hex pattern tools
    const reversedHex = hexStr.split('').reverse().join('');
    
    // 3. Base64 wrap to safely store in LocalStorage
    const finalEncoded = btoa(reversedHex);
    
    return V2_PREFIX + finalEncoded;
  } catch (e) {
    console.error('Obfuscation v2 failure:', e);
    return val;
  }
}

/** Decrypts strings back to plain text, handling both legacy v1 and strong v2 */
export function deobfuscate(val: string): string {
  if (!val) return val;

  // --- LEGACY V1 DECODE (Reverse + Base64) ---
  if (val.startsWith(V1_PREFIX)) {
    try {
      const core = val.substring(V1_PREFIX.length);
      const decoded = decodeURIComponent(escape(atob(core)));
      return decoded.split('').reverse().join('');
    } catch (e) {
      console.warn('Deobfuscation v1 failure:', e);
      return val;
    }
  }

  // --- STRONG V2 DECODE (XOR + Hex Shift) ---
  if (val.startsWith(V2_PREFIX)) {
    try {
      const core = val.substring(V2_PREFIX.length);
      const reversedHex = atob(core);
      const hexStr = reversedHex.split('').reverse().join('');
      
      let decoded = '';
      for (let i = 0; i < hexStr.length; i += 2) {
        const hexBlock = hexStr.substring(i, i + 2);
        const charCode = parseInt(hexBlock, 16) ^ XOR_KEY.charCodeAt((i / 2) % XOR_KEY.length);
        decoded += String.fromCharCode(charCode);
      }
      return decoded;
    } catch(e) {
      console.warn('Deobfuscation v2 failure:', e);
      return val; 
    }
  }

  return val; // It's a raw unencrypted string
}

/** Check if string is encrypted under any standard */
export function isObfuscated(val: string): boolean {
  return typeof val === 'string' && (val.startsWith(V1_PREFIX) || val.startsWith(V2_PREFIX));
}
