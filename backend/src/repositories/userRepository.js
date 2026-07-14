import { prisma } from '../config/prisma.js';

const publicSelect = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  bio: true,
  isOnline: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  tokenVersion: true,
  deletedAt: true,
};

export const userRepository = {
  findById(id) {
    return prisma.user.findUnique({ where: { id }, select: publicSelect });
  },

  findByIdWithPassword(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { ...publicSelect, passwordHash: true },
    });
  },

  findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...publicSelect, passwordHash: true },
    });
  },

  findByUsername(username) {
    return prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: publicSelect,
    });
  },

  create({ username, email, passwordHash }) {
    return prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
      },
      select: publicSelect,
    });
  },

  update(id, data) {
    return prisma.user.update({ where: { id }, data, select: publicSelect });
  },

  softDelete(id) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isOnline: false },
      select: publicSelect,
    });
  },

  bumpTokenVersion(id) {
    return prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
      select: publicSelect,
    });
  },

  setPresence(id, isOnline, lastSeenAt) {
    return prisma.user.update({
      where: { id },
      data: { isOnline, lastSeenAt: lastSeenAt ?? new Date() },
      select: publicSelect,
    });
  },

  search({ query, viewerId, limit, cursor }) {
    const q = query.trim().toLowerCase();
    return prisma.user.findMany({
      where: {
        AND: [
          { deletedAt: null },
          { id: { not: viewerId } },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: publicSelect,
      orderBy: [{ username: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  },
};
