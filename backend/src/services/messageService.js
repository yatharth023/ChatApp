import { messageRepository } from '../repositories/messageRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { blockService } from './blockService.js';
import { friendshipService } from './friendshipService.js';
import { toMessageDto } from '../utils/dto.js';
import { buildRoomId, roomContains } from '../utils/roomId.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

const clampLimit = (limit) => {
  const n = Number(limit) || DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
};

/**
 * Reaction shape: { emoji, userId, createdAt }
 * We store the whole array on the message and mutate in one write.
 * A user may only have one reaction of a given emoji on a given message.
 */
const toggleReaction = (reactions = [], emoji, userId) => {
  const filtered = reactions.filter((r) => !(r.emoji === emoji && r.userId === userId));
  if (filtered.length === reactions.length) {
    filtered.push({ emoji, userId, createdAt: new Date().toISOString() });
  }
  return filtered;
};

const removeReaction = (reactions = [], emoji, userId) =>
  reactions.filter((r) => !(r.emoji === emoji && r.userId === userId));

export const messageService = {
  async send(senderId, payload) {
    const { receiverId, clientMessageId } = payload;
    if (senderId === receiverId) {
      throw ApiError.badRequest('CANNOT_SEND_TO_SELF', 'Cannot message yourself');
    }

    const receiver = await userRepository.findById(receiverId);
    if (!receiver || receiver.deletedAt) throw ApiError.notFound('USER_NOT_FOUND', 'Recipient not found');

    await blockService.ensureNotBlocked(senderId, receiverId);
    await friendshipService.ensureFriends(senderId, receiverId);

    // Idempotent by (senderId, clientMessageId) — safe to retry.
    if (clientMessageId) {
      const existing = await messageRepository.findByClientMessageId(senderId, clientMessageId);
      if (existing) return toMessageDto(existing);
    }

    const roomId = buildRoomId(senderId, receiverId);
    const expiresAt = payload.expiresInSeconds
      ? new Date(Date.now() + payload.expiresInSeconds * 1000)
      : null;

    if (payload.replyToMessageId) {
      const parent = await messageRepository.findById(payload.replyToMessageId);
      if (!parent || parent.roomId !== roomId) {
        throw ApiError.badRequest('BAD_REPLY_TARGET', 'Reply target does not belong to this conversation');
      }
    }

    const row = await messageRepository.create({
      clientMessageId: clientMessageId ?? null,
      senderId,
      receiverId,
      roomId,
      encryptedPayload: payload.encryptedPayload,
      iv: payload.iv,
      mediaUrl: payload.mediaUrl ?? null,
      mediaType: payload.mediaType ?? null,
      thumbnail: payload.thumbnailUrl ?? null,
      fileSize: payload.fileSize ?? null,
      status: 'SENT',
      replyToMessageId: payload.replyToMessageId ?? null,
      reactions: [],
      expiresAt,
    });
    return toMessageDto(row);
  },

  async history(userId, { peerId, cursor, limit }) {
    const roomId = buildRoomId(userId, peerId);
    const rows = await messageRepository.history({
      roomId,
      cursor: cursor ?? null,
      limit: clampLimit(limit),
    });
    const clamped = clampLimit(limit);
    const hasMore = rows.length > clamped;
    const items = hasMore ? rows.slice(0, clamped) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return {
      roomId,
      messages: items.map(toMessageDto).reverse(),
      nextCursor,
    };
  },

  async search(userId, { peerId, q, limit }) {
    const roomId = buildRoomId(userId, peerId);
    const rows = await messageRepository.search({
      roomId,
      query: q,
      limit: clampLimit(limit),
    });
    return { roomId, matches: rows.map(toMessageDto) };
  },

  async conversations(userId) {
    const rows = await messageRepository.conversationsForUser(userId);
    return rows.map((row) => ({
      roomId: row.roomId,
      peerId: row.senderId === userId ? row.receiverId : row.senderId,
      lastMessage: toMessageDto(row),
      unreadCount: Number(row.unreadCount ?? 0),
    }));
  },

  async markStatus(userId, messageIds, status) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return [];
    // Fetch to know rooms — we only touch messages this user actually received.
    const found = await Promise.all(messageIds.map((id) => messageRepository.findById(id)));
    const eligible = found.filter(
      (m) => m && !m.deletedAt && m.receiverId === userId && m.status !== status,
    );
    if (eligible.length === 0) return [];

    // Groups by roomId to keep updates chunked.
    const grouped = new Map();
    for (const m of eligible) {
      const arr = grouped.get(m.roomId) ?? [];
      arr.push(m.id);
      grouped.set(m.roomId, arr);
    }

    for (const [roomId, ids] of grouped) {
      await messageRepository.markManyStatus(roomId, userId, ids, status);
    }

    return eligible.map((m) => ({ id: m.id, senderId: m.senderId, roomId: m.roomId }));
  },

  async edit(userId, messageId, encryptedPayload, iv) {
    const existing = await messageRepository.findById(messageId);
    if (!existing || existing.deletedAt) throw ApiError.notFound('MESSAGE_NOT_FOUND', 'Message not found');
    if (existing.senderId !== userId) {
      throw ApiError.forbidden('CANNOT_EDIT', 'You can only edit your own messages');
    }
    const updated = await messageRepository.edit(messageId, encryptedPayload, iv);
    return toMessageDto(updated);
  },

  async softDelete(userId, messageId) {
    const existing = await messageRepository.findById(messageId);
    if (!existing || existing.deletedAt) throw ApiError.notFound('MESSAGE_NOT_FOUND', 'Message not found');
    if (existing.senderId !== userId) {
      throw ApiError.forbidden('CANNOT_DELETE', 'You can only delete your own messages');
    }
    const updated = await messageRepository.softDelete(messageId);
    return toMessageDto(updated);
  },

  async react(userId, messageId, emoji) {
    const existing = await messageRepository.findById(messageId);
    if (!existing || existing.deletedAt) throw ApiError.notFound('MESSAGE_NOT_FOUND', 'Message not found');
    if (!roomContains(existing.roomId, userId)) {
      throw ApiError.forbidden('NOT_A_PARTICIPANT', 'You are not part of this conversation');
    }
    const nextReactions = toggleReaction(existing.reactions, emoji, userId);
    const updated = await messageRepository.setReactions(messageId, nextReactions);
    return toMessageDto(updated);
  },

  async removeReaction(userId, messageId, emoji) {
    const existing = await messageRepository.findById(messageId);
    if (!existing || existing.deletedAt) throw ApiError.notFound('MESSAGE_NOT_FOUND', 'Message not found');
    if (!roomContains(existing.roomId, userId)) {
      throw ApiError.forbidden('NOT_A_PARTICIPANT', 'You are not part of this conversation');
    }
    const nextReactions = removeReaction(existing.reactions, emoji, userId);
    const updated = await messageRepository.setReactions(messageId, nextReactions);
    return toMessageDto(updated);
  },
};
