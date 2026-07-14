import { presenceService } from '../../services/presenceService.js';

export const userRoom = (userId) => `user:${userId}`;
export const chatRoom = (roomId) => `room:${roomId}`;

/**
 * Emits an event to every socket bound to the given user, across devices.
 * Falls back to the user's Socket.io room (populated on connect).
 */
export const emitToUser = async (io, userId, event, payload) => {
  const sockets = await presenceService.socketsFor(userId);
  if (sockets.length === 0) {
    io.to(userRoom(userId)).emit(event, payload);
    return 0;
  }
  for (const sid of sockets) io.to(sid).emit(event, payload);
  return sockets.length;
};

export const emitToRoom = (io, roomId, event, payload) =>
  io.to(chatRoom(roomId)).emit(event, payload);
