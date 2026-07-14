import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

const buildClient = (label) => {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError: (err) => {
      const target = 'READONLY';
      return err.message.includes(target);
    },
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
