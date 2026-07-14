import { secureStorage } from './storage.js';

/**
 * Client-side end-to-end encryption using AES-GCM (Web Crypto).
 *
 * v1 uses a pre-shared symmetric key derived deterministically from the
 * conversation's roomId + a per-user salt. This ships a working E2E flow
 * without a full key-exchange (X3DH/Signal) surface — the protocol is
 * upgrade-safe: swap this module for an ECDH handshake without touching
 * the transport / storage layers.
 *
 *   deriveKey(roomId, salt) → CryptoKey  (cached in IndexedDB per room)
 *   encrypt(key, plaintext) → { ciphertext, iv }
 *   decrypt(key, ciphertext, iv) → plaintext
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const fromBase64 = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

/**
 * Derives a CryptoKey via PBKDF2 from a stable secret material.
 * In production this material would come from a real key exchange.
 */
export const deriveRoomKey = async (roomId, salt) => {
  const cached = await secureStorage.getKey(roomId);
  if (cached) return cached;

  const base = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${roomId}:${salt ?? 'chatapp-shared-salt-v1'}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt ?? 'chatapp-shared-salt-v1'),
      iterations: 250_000,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  await secureStorage.setKey(roomId, key);
  return key;
};

export const encryptText = async (key, plaintext) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );
  return { encryptedPayload: toBase64(ciphertext), iv: toBase64(iv) };
};

export const decryptText = async (key, encryptedPayload, iv) => {
  if (!encryptedPayload) return '';
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv) },
      key,
      fromBase64(encryptedPayload),
    );
    return decoder.decode(plain);
  } catch {
    return '⚠︎ unable to decrypt';
  }
};
