import { logger } from '../../config/logger.js';
import { presenceService } from '../../services/presenceService.js';

export const userRoom = (userId) => `user:${userId}`;
export const chatRoom = (roomId) => `room:${roomId}`;

/**
 * Emits an event to every socket bound to the given user, across devices.
 * Best-effort: a failure in Redis or the adapter is logged but never
 * thrown, so a REST handler that fires realtime notifications alongside
 * its main work still returns a 2xx if the DB work succeeded.
 */
export const emitToUser = async (io, userId, event, payload) => {
  try {
    const sockets = await presenceService.socketsFor(userId);
    if (sockets.length === 0) {
      io.to(userRoom(userId)).emit(event, payload);
      return 0;
    }
    for (const sid of sockets) io.to(sid).emit(event, payload);
    return sockets.length;
  } catch (err) {
    logger.warn({ err, userId, event }, 'emitToUser.failed');
    return 0;
  }
};

export const emitToRoom = (io, roomId, event, payload) => {
  try {
    io.to(chatRoom(roomId)).emit(event, payload);
  } catch (err) {
    logger.warn({ err, roomId, event }, 'emitToRoom.failed');
  }
};
