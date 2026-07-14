import { prisma } from '../config/prisma.js';

export const blockRepository = {
  block(blockerId, blockedId) {
    return prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  },

  unblock(blockerId, blockedId) {
    return prisma.blockedUser.deleteMany({ where: { blockerId, blockedId } });
  },

  isBlockedEitherWay(a, b) {
    return prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
  },

  listByBlocker(blockerId) {
    return prisma.blockedUser.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: { id: true, username: true, avatarUrl: true, isOnline: true, lastSeenAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
