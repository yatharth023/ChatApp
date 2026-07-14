import { wrapEvent } from '../utils/handler.js';
import { chatRoom } from '../utils/emit.js';
import { blockService } from '../../services/blockService.js';
import { peerOf, roomContains } from '../../utils/roomId.js';
import { ApiError } from '../../utils/ApiError.js';

const TYPING_TTL_MS = 5000;

/**
 * Typing indicator. `socket.to(...).emit(...)` broadcasts to every socket in
 * the room except the emitting socket — so the sender never sees their own
 * "typing…" bubble, but peer devices do.
 */
const typingStart = wrapEvent('typing_start', async ({ roomId }, { socket, user }) => {
  if (!roomContains(roomId, user.id)) {
    throw ApiError.forbidden('NOT_A_PARTICIPANT', 'You are not part of this room');
  }
  const peerId = peerOf(roomId, user.id);
  await blockService.ensureNotBlocked(user.id, peerId);

  socket.to(chatRoom(roomId)).emit('typing', {
    userId: user.id,
    roomId,
    expiresAt: new Date(Date.now() + TYPING_TTL_MS).toISOString(),
  });
});

const typingStop = wrapEvent('typing_stop', async ({ roomId }, { socket, user }) => {
  if (!roomContains(roomId, user.id)) return;
  socket.to(chatRoom(roomId)).emit('typing', {
    userId: user.id,
    roomId,
    expiresAt: null,
  });
});

export const registerTypingHandlers = (io, socket) => {
  socket.on('typing_start', typingStart(io, socket));
  socket.on('typing_stop', typingStop(io, socket));
};
