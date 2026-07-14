import { presenceService } from '../../services/presenceService.js';
import { userRoom } from '../utils/emit.js';
import { logger } from '../../config/logger.js';

/**
 * Presence lifecycle:
 *   - on connect: register socket, broadcast `user_online` if first device
 *   - on disconnect: deregister, broadcast `user_offline` + last_seen if last device
 *
 * Broadcasts go to `user:{peerId}` rooms — each user's own room across devices.
 * We don't fan out to the entire user base; presence is peer-scoped.
 */
export const registerPresenceHandlers = async (io, socket) => {
  const { id: userId } = socket.user;

  await socket.join(userRoom(userId));

  try {
    const { becameOnline } = await presenceService.trackConnect(userId, socket.id);
    if (becameOnline) {
      const at = new Date().toISOString();
      io.emit('user_online', { userId, at });
    }
  } catch (err) {
    logger.error({ err, userId }, 'presence.connect.failed');
  }

  socket.on('disconnect', async (reason) => {
    try {
      const { becameOffline, at } = await presenceService.trackDisconnect(socket.id);
      if (becameOffline) {
        io.emit('user_offline', { userId, at });
        io.emit('last_seen', { userId, at });
      }
      logger.debug({ userId, reason }, 'socket.disconnected');
    } catch (err) {
      logger.error({ err, userId }, 'presence.disconnect.failed');
    }
  });
};
