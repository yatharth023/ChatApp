import { prisma } from '../config/prisma.js';

export const refreshTokenRepository = {
  create({ userId, jti, tokenHash, deviceInfo, ip, expiresAt }) {
    return prisma.refreshToken.create({
      data: { userId, jti, tokenHash, deviceInfo, ip, expiresAt },
    });
  },

  findByJti(jti) {
    return prisma.refreshToken.findUnique({ where: { jti } });
  },

  revoke(jti) {
    return prisma.refreshToken.delete({ where: { jti } });
  },

  revokeAllForUser(userId) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },

  purgeExpired() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },
};
