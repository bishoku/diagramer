import LZString from 'lz-string';

/**
 * Utility functions for encrypting and decrypting data using AES-GCM (Web Crypto API).
 * This ensures data remains secure during URL sharing if a PIN is provided.
 */

// Helper to get crypto object safely (browser vs node/test environment)
const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof crypto !== 'undefined') {
    return crypto;
  }
  throw new Error('Web Crypto API is not available');
};

// Generates a cryptographic key from a PIN using PBKDF2
const getKeyFromPin = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
  const cryptoAPI = getCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await cryptoAPI.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return cryptoAPI.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Helper for btoa/atob that works in browser and node
const btoaHelper = (str: string): string => {
  if (typeof btoa !== 'undefined') return btoa(str);
  if (typeof window !== 'undefined' && window.btoa) return window.btoa(str);
  throw new Error('btoa is not available');
};

const atobHelper = (b64: string): string => {
  if (typeof atob !== 'undefined') return atob(b64);
  if (typeof window !== 'undefined' && window.atob) return window.atob(b64);
  throw new Error('atob is not available');
};

// Converts ArrayBuffer to Base64
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoaHelper(binary);
};

// Converts Base64 to Uint8Array
const base64ToBuffer = (base64: string): Uint8Array => {
  const binary_string = atobHelper(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

export const encryptData = async (data: string, pin: string): Promise<string> => {
  if (!pin) return data;

  const cryptoAPI = getCrypto();
  const enc = new TextEncoder();
  const iv = cryptoAPI.getRandomValues(new Uint8Array(12));
  const salt = cryptoAPI.getRandomValues(new Uint8Array(16));
  const key = await getKeyFromPin(pin, salt);

  const encrypted = await cryptoAPI.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    enc.encode(data)
  );

  // Combine salt, iv, and encrypted data into a single base64 string
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return bufferToBase64(combined.buffer);
};

export const decryptData = async (encryptedBase64: string, pin: string): Promise<string> => {
  if (!pin) return encryptedBase64;

  try {
    const cryptoAPI = getCrypto();
    const combined = base64ToBuffer(encryptedBase64);
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const key = await getKeyFromPin(pin, salt);

    const decrypted = await cryptoAPI.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    throw new Error('Invalid PIN or corrupted data');
  }
};

/**
 * Utility functions for compressing and decompressing data.
 * Using LZ-String to create URL-safe compressed strings.
 */
export const compressData = (data: string): string => {
  return LZString.compressToEncodedURIComponent(data);
};

export const decompressData = (compressed: string): string | null => {
  return LZString.decompressFromEncodedURIComponent(compressed);
};

// Helpers for URL-safe Base64 conversion
const toUrlSafeBase64 = (base64: string): string => {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromUrlSafeBase64 = (safeBase64: string): string => {
  let base64 = safeBase64.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
};

/**
 * Orchestrates the full process: Stringify -> Compress (if encrypting) -> Encrypt (optional) -> Encode to URL-safe format
 */
export const prepareShareData = async (jsonData: any, pin?: string): Promise<string> => {
  const stringified = JSON.stringify(jsonData);

  if (pin) {
    // Compress first using Base64 (valid ASCII) to prevent TextEncoder UTF-8 corruption during encryption
    const compressed = LZString.compressToBase64(stringified);
    const encrypted = await encryptData(compressed, pin);
    // Convert base64 output of encryption to URL-safe format and prepend ENC:
    return 'ENC:' + toUrlSafeBase64(encrypted);
  }

  // If no PIN, compress the stringified JSON normally using LZ-string encoded URI component
  return compressData(stringified);
};

/**
 * Orchestrates the full reverse process: URL decode/Decrypt -> Decompress -> Parse
 */
export const extractShareData = async (compressedData: string, pin?: string): Promise<any> => {
  if (compressedData.startsWith('ENC:')) {
    if (!pin) {
      throw new Error('PIN_REQUIRED');
    }
    const safeEncryptedPayload = compressedData.substring(4);
    const standardEncryptedBase64 = fromUrlSafeBase64(safeEncryptedPayload);
    const decryptedCompressed = await decryptData(standardEncryptedBase64, pin);
    const decompressedJson = LZString.decompressFromBase64(decryptedCompressed);
    if (!decompressedJson) {
      throw new Error('Failed to decompress decrypted data');
    }
    return JSON.parse(decompressedJson);
  }

  // Otherwise, it is unencrypted and compressed as a normal URI component
  const decompressed = decompressData(compressedData);
  if (!decompressed) {
    throw new Error('Failed to decompress data');
  }
  return JSON.parse(decompressed);
};
