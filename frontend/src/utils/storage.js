import { get, set, del } from 'idb-keyval';

const KEY_PREFIX = 'chatapp:';

/**
 * IndexedDB-backed storage for symmetric keys (AES-GCM). We store CryptoKey
 * objects directly — structured clone preserves them across sessions without
 * exposing raw material to localStorage/JS heap between reads.
 */
export const secureStorage = {
  async getKey(roomId) {
    return get(`${KEY_PREFIX}key:${roomId}`);
  },
  async setKey(roomId, cryptoKey) {
    return set(`${KEY_PREFIX}key:${roomId}`, cryptoKey);
  },
  async clearKey(roomId) {
    return del(`${KEY_PREFIX}key:${roomId}`);
  },
};

const memory = new Map();

/**
 * The access token lives only in memory. Refresh happens via httpOnly cookie.
 * Purposely not persisted — prevents XSS token theft.
 */
export const accessTokenStore = {
  get() {
    return memory.get('accessToken') ?? null;
  },
  set(token) {
    if (!token) memory.delete('accessToken');
    else memory.set('accessToken', token);
  },
  clear() {
    memory.delete('accessToken');
  },
};
