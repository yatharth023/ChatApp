import { wrapEvent } from '../utils/handler.js';
import { emitToRoom, emitToUser } from '../utils/emit.js';
import { messageService } from '../../services/messageService.js';
import { presenceService } from '../../services/presenceService.js';
import { enforceRateLimit } from '../utils/socketRateLimit.js';
import { peerOf } from '../../utils/roomId.js';

const SEND_LIMIT = 60;
const SEND_WINDOW_SECONDS = 60;
const REACT_LIMIT = 30;
const REACT_WINDOW_SECONDS = 30;

const sendMessage = wrapEvent('send_message', async (payload, { io, user }) => {
  await enforceRateLimit({
    userId: user.id,
    event: 'send_message',
    limit: SEND_LIMIT,
    windowSeconds: SEND_WINDOW_SECONDS,
  });

  const message = await messageService.send(user.id, payload);

  // Fan-out: the whole room gets receive_message; sender's other devices too.
  emitToRoom(io, message.roomId, 'receive_message', { message });

  const peerId = peerOf(message.roomId, user.id);
  const peerOnline = await presenceService.isOnline(peerId);
  if (peerOnline) {
    // Recipient is online — the client will emit `message_delivered` back;
    // we do not preemptively flip status here to preserve accuracy.
  }
  return { message };
});

const messageDelivered = wrapEvent('message_delivered', async ({ messageIds }, { io, user }) => {
  const updated = await messageService.markStatus(user.id, messageIds, 'DELIVERED');
  const bySender = new Map();
  for (const row of updated) {
    const arr = bySender.get(row.senderId) ?? [];
    arr.push(row);
    bySender.set(row.senderId, arr);
  }
  const at = new Date().toISOString();
  for (const [senderId, rows] of bySender) {
    for (const row of rows) {
      await emitToUser(io, senderId, 'message_status', {
        messageId: row.id,
        status: 'DELIVERED',
        at,
      });
    }
  }
  return { updated: updated.map((r) => r.id) };
});

const messageSeen = wrapEvent('message_seen', async ({ messageIds }, { io, user }) => {
  const updated = await messageService.markStatus(user.id, messageIds, 'READ');
  const bySender = new Map();
  for (const row of updated) {
    const arr = bySender.get(row.senderId) ?? [];
    arr.push(row);
    bySender.set(row.senderId, arr);
  }
  const at = new Date().toISOString();
  for (const [senderId, rows] of bySender) {
    for (const row of rows) {
      await emitToUser(io, senderId, 'message_status', {
        messageId: row.id,
        status: 'READ',
        at,
      });
    }
  }
  return { updated: updated.map((r) => r.id) };
});

const editMessage = wrapEvent('edit_message', async ({ messageId, encryptedPayload, iv }, { io, user }) => {
  const message = await messageService.edit(user.id, messageId, encryptedPayload, iv);
  emitToRoom(io, message.roomId, 'message_updated', { message });
  return { message };
});

const deleteMessage = wrapEvent('delete_message', async ({ messageId }, { io, user }) => {
  const message = await messageService.softDelete(user.id, messageId);
  emitToRoom(io, message.roomId, 'message_deleted', {
    messageId: message.id,
    roomId: message.roomId,
    reason: 'user',
  });
  return { messageId: message.id };
});

const reactMessage = wrapEvent('react_message', async ({ messageId, emoji }, { io, user }) => {
  await enforceRateLimit({
    userId: user.id,
    event: 'react_message',
    limit: REACT_LIMIT,
    windowSeconds: REACT_WINDOW_SECONDS,
  });
  const message = await messageService.react(user.id, messageId, emoji);
  emitToRoom(io, message.roomId, 'reaction_updated', {
    messageId: message.id,
    reactions: message.reactions,
  });
  return { messageId: message.id, reactions: message.reactions };
});

const removeReaction = wrapEvent('remove_reaction', async ({ messageId, emoji }, { io, user }) => {
  const message = await messageService.removeReaction(user.id, messageId, emoji);
  emitToRoom(io, message.roomId, 'reaction_updated', {
    messageId: message.id,
    reactions: message.reactions,
  });
  return { messageId: message.id, reactions: message.reactions };
});

const fetchHistory = wrapEvent('fetch_history', async ({ roomId, cursor, limit }, { socket, user }) => {
  const [a, b] = roomId.split('_');
  const peerId = a === user.id ? b : a;
  const result = await messageService.history(user.id, { peerId, cursor, limit });
  socket.emit('history_loaded', result);
  return result;
});

export const registerMessageHandlers = (io, socket) => {
  socket.on('send_message', sendMessage(io, socket));
  socket.on('message_delivered', messageDelivered(io, socket));
  socket.on('message_seen', messageSeen(io, socket));
  socket.on('edit_message', editMessage(io, socket));
  socket.on('delete_message', deleteMessage(io, socket));
  socket.on('react_message', reactMessage(io, socket));
  socket.on('remove_reaction', removeReaction(io, socket));
  socket.on('fetch_history', fetchHistory(io, socket));
};
