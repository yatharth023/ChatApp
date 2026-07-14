import { userRepository } from '../repositories/userRepository.js';
import { blockRepository } from '../repositories/blockRepository.js';
import { friendshipService } from './friendshipService.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { toPublicUserDto, toUserDto } from '../utils/dto.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const userService = {
  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
    return toUserDto(user);
  },

  async publicProfile(viewerId, userId) {
    const user = await userRepository.findById(userId);
    if (!user || user.deletedAt) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');

    const [blocked, friendStatus] = await Promise.all([
      blockRepository.isBlockedEitherWay(viewerId, userId),
      friendshipService.statusBetween(viewerId, userId),
    ]);

    return {
      ...toPublicUserDto(user),
      isBlockedByYou: Boolean(blocked && blocked.blockerId === viewerId),
      hasBlockedYou: Boolean(blocked && blocked.blockedId === viewerId),
      friendStatus, // 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted' | 'self'
    };
  },

  async updateProfile(userId, patch) {
    if (patch.username) {
      const existing = await userRepository.findByUsername(patch.username);
      if (existing && existing.id !== userId) {
        throw ApiError.conflict('USERNAME_TAKEN', 'Username already taken');
      }
      patch.username = patch.username.toLowerCase();
    }
    const updated = await userRepository.update(userId, patch);
    return toUserDto(updated);
  },

  async changePassword(userId, currentPassword, newPassword) {
    const record = await userRepository.findByIdWithPassword(userId);
    if (!record) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
    const ok = await verifyPassword(currentPassword, record.passwordHash);
    if (!ok) throw ApiError.badRequest('WRONG_PASSWORD', 'Current password is incorrect');

    const nextHash = await hashPassword(newPassword);
    await userRepository.update(userId, { passwordHash: nextHash });
    await userRepository.bumpTokenVersion(userId);
  },

  async deleteAccount(userId) {
    await userRepository.softDelete(userId);
  },

  async search(viewerId, { q, limit, cursor }) {
    const normalizedLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const results = await userRepository.search({
      query: q,
      viewerId,
      limit: normalizedLimit,
      cursor,
    });

    const hasMore = results.length > normalizedLimit;
    const items = hasMore ? results.slice(0, normalizedLimit) : results;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return { items: items.map(toPublicUserDto), nextCursor };
  },
};
