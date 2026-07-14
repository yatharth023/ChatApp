import { blockRepository } from '../repositories/blockRepository.js';
import { friendshipRepository } from '../repositories/friendshipRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { toPublicUserDto } from '../utils/dto.js';

export const blockService = {
  async block(blockerId, blockedId) {
    if (blockerId === blockedId) {
      throw ApiError.badRequest('CANNOT_BLOCK_SELF', 'You cannot block yourself');
    }
    const target = await userRepository.findById(blockedId);
    if (!target || target.deletedAt) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
    await blockRepository.block(blockerId, blockedId);
    // Blocking terminates the friendship (if any) so neither side can message.
    await friendshipRepository.deleteByPair(blockerId, blockedId).catch(() => {});
  },

  async unblock(blockerId, blockedId) {
    await blockRepository.unblock(blockerId, blockedId);
  },

  async list(blockerId) {
    const rows = await blockRepository.listByBlocker(blockerId);
    return rows.map((row) => ({
      blockedAt: row.createdAt,
      user: toPublicUserDto(row.blocked),
    }));
  },

  async ensureNotBlocked(a, b) {
    const record = await blockRepository.isBlockedEitherWay(a, b);
    if (record) throw ApiError.forbidden('BLOCKED', 'Interaction not allowed');
  },
};
