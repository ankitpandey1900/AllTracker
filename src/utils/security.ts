/**
 * Helpers for "Vault Masking"
 * 
 * NOTE: This just hides text (like IDs) from being easily read in the 
 * browser's DevTools or regular UI. It's not heavy-duty encryption.
 */

const V1_PREFIX = 'v1_esc_'; // Legacy simple masking
const V2_PREFIX = 'v2_enc_'; // Advanced XOR encryption
const V3_PREFIX = 'v3_id_';  // 🔐 IDENTITY-LINKED VAULT (User Salt)
const XOR_KEY = 'Arena_V@uLt_K3y_2026!xX';

/** 
 * Encrypt a string so it's unreadable to AIs or humans.
 * Uses a chaotic XOR shift and Hex scrambling.
 * @param salt Optional user-specific identity key for V3 protection.
 */
export function obfuscate(val: string, salt: string = ''): string {
  if (!val) return '';
  
  // If a salt is provided, we use the V3 Identity-Linked protocol
  const prefix = salt ? V3_PREFIX : V2_PREFIX;
  const activeKey = salt ? (XOR_KEY + salt) : XOR_KEY;

  if (val.startsWith(prefix)) return val; // Already encrypted at this level

  // Handle cross-grade transitions
  if (val.startsWith(V1_PREFIX) || val.startsWith(V2_PREFIX)) {
    val = deobfuscate(val, salt);
  }

  try {
    // 1. Chaotic XOR with dynamic/static key mapped to Hex
    let hexStr = '';
    for (let i = 0; i < val.length; i++) {
       const charCode = val.charCodeAt(i) ^ activeKey.charCodeAt(i % activeKey.length);
       hexStr += charCode.toString(16).padStart(2, '0');
    }
    
    // 2. Reverse hex to break generic hex pattern tools
    const reversedHex = hexStr.split('').reverse().join('');
    
    // 3. Base64 wrap to safely store in LocalStorage
    const finalEncoded = btoa(reversedHex);
    
    return prefix + finalEncoded;
  } catch (e) {
    console.error('Obfuscation failure:', e);
    return val;
  }
}

/** 
 * Decrypts strings back to plain text.
 * Handles legacy v1, v2, and the new salted v3 identity vault.
 */
export function deobfuscate(val: string, salt: string = ''): string {
  if (!val) return val;

  // --- 💾 LEGACY V1 DECODE (Reverse + Base64) ---
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

  // --- 🔐 STRONG V2/V3 DECODE (XOR + Hex Shift) ---
  const isV3 = val.startsWith(V3_PREFIX);
  const isV2 = val.startsWith(V2_PREFIX);

  if (isV2 || isV3) {
    try {
      const activeKey = isV3 ? (XOR_KEY + salt) : XOR_KEY;
      const core = val.substring(isV3 ? V3_PREFIX.length : V2_PREFIX.length);
      const reversedHex = atob(core);
      const hexStr = reversedHex.split('').reverse().join('');
      
      let decoded = '';
      for (let i = 0; i < hexStr.length; i += 2) {
        const hexBlock = hexStr.substring(i, i + 2);
        const charCode = parseInt(hexBlock, 16) ^ activeKey.charCodeAt((i / 2) % activeKey.length);
        decoded += String.fromCharCode(charCode);
      }
      return decoded;
    } catch(e) {
      console.warn(`Deobfuscation ${isV3 ? 'v3' : 'v2'} failure:`, e);
      return val; 
    }
  }

  return val; // Raw unencrypted string
}

/** Check if string is encrypted under any standard */
export function isObfuscated(val: string): boolean {
  return typeof val === 'string' && (val.startsWith(V1_PREFIX) || val.startsWith(V2_PREFIX) || val.startsWith(V3_PREFIX));
}


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
