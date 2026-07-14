import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

/**
 * Thin JSON cache with default TTL. Uses jitter to avoid thundering herds
 * when many keys expire simultaneously.
 */
const jitter = (ttlSeconds) => Math.max(1, Math.round(ttlSeconds * (0.9 + Math.random() * 0.2)));

export const cacheService = {
  async get(key) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.warn({ err, key }, 'cache.get.failed');
      return null;
    }
  },

  async set(key, value, ttlSeconds = 60) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', jitter(ttlSeconds));
    } catch (err) {
      logger.warn({ err, key }, 'cache.set.failed');
    }
  },

  async del(key) {
    try {
      await redis.del(key);
    } catch (err) {
      logger.warn({ err, key }, 'cache.del.failed');
    }
  },

  /**
   * Convenience wrapper: read-through cache with async loader.
   */
  async remember(key, ttlSeconds, loader) {
    const cached = await cacheService.get(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    if (fresh !== undefined && fresh !== null) {
      await cacheService.set(key, fresh, ttlSeconds);
    }
    return fresh;
  },
};
