import { messageRepository } from '../repositories/messageRepository.js';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository.js';
import { logger } from '../config/logger.js';

/**
 * Cron target: soft-delete expired messages, then broadcast the deletion so
 * connected clients drop the bubble immediately (no need to refresh).
 * The IO instance is passed at registration time — the cron file itself
 * remains pure so it stays unit-testable.
 */
export const buildExpireMessagesJob = (io) => async () => {
  const expired = await messageRepository.deleteExpired();
  if (expired.length === 0) return;

  const ids = expired.map((m) => m.id);
  await messageRepository.markManyExpired(ids);

  for (const m of expired) {
    io.to(`room:${m.roomId}`).emit('message_deleted', {
      messageId: m.id,
      roomId: m.roomId,
      reason: 'expired',
    });
  }
  logger.info({ count: expired.length }, 'cron.expiredMessages');
};

export const purgeExpiredRefreshTokens = async () => {
  const { count } = await refreshTokenRepository.purgeExpired();
  if (count > 0) logger.info({ count }, 'cron.purgedRefreshTokens');
};
