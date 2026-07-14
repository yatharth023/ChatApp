import { wrapEvent } from '../utils/handler.js';
import { chatRoom } from '../utils/emit.js';
import { roomContains } from '../../utils/roomId.js';
import { ApiError } from '../../utils/ApiError.js';

const joinRoom = wrapEvent('join_room', async ({ roomId }, { socket, user }) => {
  if (!roomContains(roomId, user.id)) {
    throw ApiError.forbidden('NOT_A_PARTICIPANT', 'You are not part of this room');
  }
  await socket.join(chatRoom(roomId));
  return { roomId };
});

const leaveRoom = wrapEvent('leave_room', async ({ roomId }, { socket }) => {
  await socket.leave(chatRoom(roomId));
  return { roomId };
});

export const registerRoomHandlers = (io, socket) => {
  socket.on('join_room', joinRoom(io, socket));
  socket.on('leave_room', leaveRoom(io, socket));
};
