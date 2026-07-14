import { prisma } from '../config/prisma.js';

export const sessionRepository = {
  create({ userId, refreshJti, userAgent, ip }) {
    return prisma.userSession.create({
      data: { userId, refreshJti, userAgent, ip },
    });
  },

  findByRefreshJti(refreshJti) {
    return prisma.userSession.findUnique({ where: { refreshJti } });
  },

  updateRefreshJti(oldJti, newJti) {
    return prisma.userSession.update({
      where: { refreshJti: oldJti },
      data: { refreshJti: newJti, lastUsedAt: new Date() },
    });
  },

  revoke(refreshJti) {
    return prisma.userSession.delete({ where: { refreshJti } });
  },

  revokeAllForUser(userId) {
    return prisma.userSession.deleteMany({ where: { userId } });
  },

  listForUser(userId) {
    return prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  },
};
