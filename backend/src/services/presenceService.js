import { redis } from '../config/redis.js';
import { userRepository } from '../repositories/userRepository.js';

/**
 * Presence is authoritative in Redis. Postgres receives eventual updates so
 * offline users still show a "last seen" timestamp after Redis eviction.
 *
 * Keys:
 *   user_sockets:{userId}  → Set<socketId>
 *   socket:{socketId}      → userId
 *   last_seen:{userId}     → ISO timestamp
 */
const socketsKey = (userId) => `user_sockets:${userId}`;
const socketKey = (socketId) => `socket:${socketId}`;
const lastSeenKey = (userId) => `last_seen:${userId}`;

const LAST_SEEN_TTL_SECONDS = 60 * 60 * 24 * 60;

export const presenceService = {
  async trackConnect(userId, socketId) {
    const pipeline = redis.multi();
    pipeline.sadd(socketsKey(userId), socketId);
    pipeline.set(socketKey(socketId), userId, 'EX', 60 * 60 * 24);
    const results = await pipeline.exec();
    const currentCount = await redis.scard(socketsKey(userId));
    const becameOnline = currentCount === 1;
    if (becameOnline) {
      await userRepository.setPresence(userId, true, new Date()).catch(() => {});
    }
    return { becameOnline, results };
  },

  async trackDisconnect(socketId) {
    const userId = await redis.get(socketKey(socketId));
    if (!userId) return { becameOffline: false, userId: null, at: null };

    const pipeline = redis.multi();
    pipeline.srem(socketsKey(userId), socketId);
    pipeline.del(socketKey(socketId));
    await pipeline.exec();

    const remaining = await redis.scard(socketsKey(userId));
    if (remaining > 0) return { becameOffline: false, userId, at: null };

    const now = new Date().toISOString();
    await redis.set(lastSeenKey(userId), now, 'EX', LAST_SEEN_TTL_SECONDS);
    await userRepository.setPresence(userId, false, new Date()).catch(() => {});
    return { becameOffline: true, userId, at: now };
  },

  async isOnline(userId) {
    return (await redis.scard(socketsKey(userId))) > 0;
  },

  async socketsFor(userId) {
    return redis.smembers(socketsKey(userId));
  },

  async lastSeen(userId) {
    const cached = await redis.get(lastSeenKey(userId));
    if (cached) return cached;
    const user = await userRepository.findById(userId);
    return user?.lastSeenAt?.toISOString() ?? null;
  },
};
