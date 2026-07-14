import { friendshipRepository } from '../repositories/friendshipRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { blockService } from './blockService.js';
import { ApiError } from '../utils/ApiError.js';
import { toPublicUserDto } from '../utils/dto.js';

const otherOf = (row, userId) => (row.userAId === userId ? row.userB : row.userA);

const shapeFriend = (row, userId) => ({
  friendshipId: row.id,
  since: row.respondedAt ?? row.createdAt,
  user: toPublicUserDto(otherOf(row, userId)),
});

const shapeIncoming = (row, userId) => ({
  friendshipId: row.id,
  requestedAt: row.createdAt,
  from: toPublicUserDto(otherOf(row, userId)),
});

const shapeOutgoing = (row, userId) => ({
  friendshipId: row.id,
  requestedAt: row.createdAt,
  to: toPublicUserDto(otherOf(row, userId)),
});

export const friendshipService = {
  async sendRequest(fromId, toId) {
    if (fromId === toId) {
      throw ApiError.badRequest('CANNOT_FRIEND_SELF', 'You cannot friend yourself');
    }
    const target = await userRepository.findById(toId);
    if (!target || target.deletedAt) {
      throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
    }
    await blockService.ensureNotBlocked(fromId, toId);

    const existing = await friendshipRepository.findByPair(fromId, toId);
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw ApiError.conflict('ALREADY_FRIENDS', 'You are already friends');
      }
      if (existing.initiatorId === fromId) {
        throw ApiError.conflict('REQUEST_ALREADY_SENT', 'Friend request already sent');
      }
      // Peer already sent me a request — accept it instead of creating a new one.
      const accepted = await friendshipRepository.accept(existing.id);
      return { record: accepted, autoAccepted: true };
    }

    const record = await friendshipRepository.create({ a: fromId, b: toId, initiatorId: fromId });
    return { record, autoAccepted: false };
  },

  async accept(userId, peerId) {
    const existing = await friendshipRepository.findByPair(userId, peerId);
    if (!existing) throw ApiError.notFound('REQUEST_NOT_FOUND', 'No pending request found');
    if (existing.status === 'ACCEPTED') return existing;
    if (existing.initiatorId === userId) {
      throw ApiError.forbidden('CANNOT_ACCEPT_OWN', 'You cannot accept your own request');
    }
    return friendshipRepository.accept(existing.id);
  },

  async decline(userId, peerId) {
    const existing = await friendshipRepository.findByPair(userId, peerId);
    if (!existing) return null;
    if (existing.status !== 'PENDING') {
      throw ApiError.badRequest('NOT_PENDING', 'This request is not pending');
    }
    if (existing.initiatorId === userId) {
      throw ApiError.forbidden('CANNOT_DECLINE_OWN', 'You cannot decline your own request');
    }
    await friendshipRepository.delete(existing.id);
    return existing;
  },

  async cancel(userId, peerId) {
    const existing = await friendshipRepository.findByPair(userId, peerId);
    if (!existing || existing.status !== 'PENDING') return null;
    if (existing.initiatorId !== userId) {
      throw ApiError.forbidden('CANNOT_CANCEL_OTHER', 'You did not send this request');
    }
    await friendshipRepository.delete(existing.id);
    return existing;
  },

  async removeFriend(userId, peerId) {
    const existing = await friendshipRepository.findByPair(userId, peerId);
    if (!existing) return null;
    await friendshipRepository.delete(existing.id);
    return existing;
  },

  async listFriends(userId) {
    const rows = await friendshipRepository.listAccepted(userId);
    return rows.map((row) => shapeFriend(row, userId));
  },

  async listIncoming(userId) {
    const rows = await friendshipRepository.listIncomingPending(userId);
    return rows.map((row) => shapeIncoming(row, userId));
  },

  async listOutgoing(userId) {
    const rows = await friendshipRepository.listOutgoingPending(userId);
    return rows.map((row) => shapeOutgoing(row, userId));
  },

  /**
   * Returns the friendship status between two users from `viewer`'s POV.
   *   'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted'
   */
  async statusBetween(viewerId, peerId) {
    if (viewerId === peerId) return 'self';
    const record = await friendshipRepository.findByPair(viewerId, peerId);
    if (!record) return 'none';
    if (record.status === 'ACCEPTED') return 'accepted';
    return record.initiatorId === viewerId ? 'pending_outgoing' : 'pending_incoming';
  },

  async ensureFriends(viewerId, peerId) {
    const status = await friendshipService.statusBetween(viewerId, peerId);
    if (status !== 'accepted') {
      throw ApiError.forbidden(
        'NOT_FRIENDS',
        'You can only message users who have accepted your friend request',
      );
    }
  },
};
