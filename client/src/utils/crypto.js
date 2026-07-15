// WebCrypto AES-256-GCM Encryption / Decryption helper for Data Channels

// Helper to convert ArrayBuffer to Base64
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper to convert Base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Derive a Cryptographic key from the roomId (used as a passcode) using PBKDF2
export const deriveRoomKey = async (roomId) => {
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(roomId),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Static salt for demo purposes
    const salt = encoder.encode('GatherlyCryptographicSaltSecret');

    return await window.crypto.subtle.deriveKey(
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
  } catch (err) {
    console.error('Failed to derive encryption key:', err);
    throw err;
  }
};

// Encrypt text message using the derived Room Key
export const encryptPayload = async (text, cryptoKey) => {
  try {
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
    const encodedText = encoder.encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      encodedText
    );

    return JSON.stringify({
      iv: bufferToBase64(iv),
      ciphertext: bufferToBase64(ciphertext),
    });
  } catch (err) {
    console.error('Encryption failed:', err);
    throw err;
  }
};

// Decrypt ciphertext string using the derived Room Key
export const decryptPayload = async (encryptedJsonStr, cryptoKey) => {
  try {
    const { iv, ciphertext } = JSON.parse(encryptedJsonStr);
    const decoder = new TextDecoder();

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(base64ToBuffer(iv)),
      },
      cryptoKey,
      base64ToBuffer(ciphertext)
    );

    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed: Key mismatch or tampered data.');
  }
};
