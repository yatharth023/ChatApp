import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

const buildClient = (label) => {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    // Fail fast: without these, ioredis queues commands indefinitely while
    // reconnecting. In prod under Upstash flakes that translates to socket
    // handlers hanging forever and clients seeing "send_message timed out".
    // Failing after ~1s makes callers' catch blocks kick in.
    maxRetriesPerRequest: 1,
    commandTimeout: 1500,
    connectTimeout: 5000,
    enableReadyCheck: true,
    // Exponential-backoff reconnect capped at 3s.
    retryStrategy: (times) => Math.min(times * 300, 3000),
    reconnectOnError: (err) => err.message.includes('READONLY'),
  });

  client.on('connect', () => logger.info({ label }, 'redis.connect'));
  client.on('ready', () => logger.info({ label }, 'redis.ready'));
  client.on('error', (err) => logger.error({ label, err }, 'redis.error'));
  client.on('close', () => logger.warn({ label }, 'redis.close'));

  return client;
};

/**
 * Primary Redis client — used for presence, cache, rate-limit.
 */
export const redis = buildClient('primary');

/**
 * Dedicated client for Socket.io pub/sub (see Phase 10 Redis adapter).
 * Two separate connections keep pub/sub isolated from imperative commands.
 */
export const redisPub = buildClient('pub');
export const redisSub = buildClient('sub');

export const closeRedis = async () => {
  await Promise.allSettled([redis.quit(), redisPub.quit(), redisSub.quit()]);
};
