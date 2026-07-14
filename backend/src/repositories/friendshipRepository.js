import { prisma } from '../config/prisma.js';
import { canonicalPair } from '../utils/pair.js';

const peerSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  bio: true,
  isOnline: true,
  lastSeenAt: true,
};

export const friendshipRepository = {
  findByPair(a, b) {
    const [userAId, userBId] = canonicalPair(a, b);
    return prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
  },

  create({ a, b, initiatorId }) {
    const [userAId, userBId] = canonicalPair(a, b);
    return prisma.friendship.create({
      data: { userAId, userBId, initiatorId, status: 'PENDING' },
    });
  },

  accept(id) {
    return prisma.friendship.update({
      where: { id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
  },

  delete(id) {
    return prisma.friendship.delete({ where: { id } });
  },

  deleteByPair(a, b) {
    const [userAId, userBId] = canonicalPair(a, b);
    return prisma.friendship.deleteMany({ where: { userAId, userBId } });
  },

  /**
   * All accepted friendships for a user, with the peer's public profile
   * pre-joined so the sidebar can render without a follow-up N+1.
   */
  listAccepted(userId) {
    return prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: peerSelect },
        userB: { select: peerSelect },
      },
      orderBy: { respondedAt: 'desc' },
    });
  },

  /**
   * Incoming pending requests — someone else initiated to me.
   */
  listIncomingPending(userId) {
    return prisma.friendship.findMany({
      where: {
        status: 'PENDING',
        OR: [{ userAId: userId }, { userBId: userId }],
        NOT: { initiatorId: userId },
      },
      include: {
        userA: { select: peerSelect },
        userB: { select: peerSelect },
        initiator: { select: peerSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Outgoing pending requests — I initiated, awaiting acceptance.
   */
  listOutgoingPending(userId) {
    return prisma.friendship.findMany({
      where: { status: 'PENDING', initiatorId: userId },
      include: {
        userA: { select: peerSelect },
        userB: { select: peerSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
