import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Redis-based per-user rate limit for socket events. Uses an INCR + EX TTL
 * key so scale-out replicas share the same counter.
 *
 * Best-effort: if Redis is unreachable we log and let the request through.
 * The alternative — blocking the entire socket handler on a broken Redis —
 * would surface to users as "send_message timed out", which is much worse
 * than briefly allowing a burst above the limit.
 */
export const enforceRateLimit = async ({ userId, event, limit, windowSeconds }) => {
  const key = `rl:${event}:${userId}`;
  let count;
  try {
    count = await redis.incr(key);
    if (count === 1) redis.expire(key, windowSeconds).catch(() => {});
  } catch (err) {
    logger.warn({ err, event, userId }, 'rateLimit.redis.failed');
    return; // fail open
  }
  if (count > limit) {
    throw ApiError.tooMany('SOCKET_RATE_LIMITED', `Too many ${event} events`);
  }
};
