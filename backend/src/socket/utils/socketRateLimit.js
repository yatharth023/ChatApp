import { redis } from '../../config/redis.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Redis-based per-user rate limit for socket events. Uses an INCR + EX TTL
 * key so scale-out replicas share the same counter.
 */
export const enforceRateLimit = async ({ userId, event, limit, windowSeconds }) => {
  const key = `rl:${event}:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  if (count > limit) {
    throw ApiError.tooMany('SOCKET_RATE_LIMITED', `Too many ${event} events`);
  }
};
