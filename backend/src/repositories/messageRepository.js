import { prisma } from '../config/prisma.js';

const messageSelect = {
  id: true,
  clientMessageId: true,
  senderId: true,
  receiverId: true,
  roomId: true,
  encryptedPayload: true,
  iv: true,
  mediaUrl: true,
  mediaType: true,
  thumbnail: true,
  fileSize: true,
  status: true,
  replyToMessageId: true,
  reactions: true,
  editedAt: true,
  deletedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
};

export const messageRepository = {
  create(data) {
    return prisma.message.create({ data, select: messageSelect });
  },

  findById(id) {
    return prisma.message.findUnique({ where: { id }, select: messageSelect });
  },

  findByClientMessageId(senderId, clientMessageId) {
    return prisma.message.findFirst({
      where: { senderId, clientMessageId },
      select: messageSelect,
    });
  },

  updateStatus(id, status) {
    return prisma.message.update({
      where: { id },
      data: { status },
      select: messageSelect,
    });
  },

  markManyStatus(roomId, viewerId, ids, status) {
    // Only mark statuses for messages the viewer received (not sent).
    return prisma.message.updateMany({
      where: {
        id: { in: ids },
        roomId,
        receiverId: viewerId,
        NOT: { status },
      },
      data: { status },
    });
  },

  softDelete(id) {
    return prisma.message.update({
      where: { id },
      data: { deletedAt: new Date(), encryptedPayload: '', iv: '' },
      select: messageSelect,
    });
  },

  edit(id, encryptedPayload, iv) {
    return prisma.message.update({
      where: { id },
      data: { encryptedPayload, iv, editedAt: new Date() },
      select: messageSelect,
    });
  },

  setReactions(id, reactions) {
    return prisma.message.update({
      where: { id },
      data: { reactions },
      select: messageSelect,
    });
  },

  history({ roomId, limit, cursor }) {
    return prisma.message.findMany({
      where: { roomId, deletedAt: null },
      select: messageSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  },

  /**
   * Server-side ciphertext search: matches the searchVector for headers,
   * plus a fallback partial match on mediaUrl for shared links.
   * Returns a preview snippet the sender can decrypt client-side.
   */
  search({ roomId, query, limit }) {
    const q = query.trim();
    const wildcard = `%${q}%`;
    // Tagged-template form of $queryRaw is the canonical safe API.
    return prisma.$queryRaw`
      SELECT id, "clientMessageId", "senderId", "receiverId", "roomId",
             "encryptedPayload", iv, "mediaUrl", "mediaType", thumbnail,
             "fileSize", status, "replyToMessageId", reactions,
             "editedAt", "deletedAt", "expiresAt", "createdAt", "updatedAt"
      FROM messages
      WHERE "roomId" = ${roomId}
        AND "deletedAt" IS NULL
        AND (
          "searchVector" @@ plainto_tsquery('simple', ${q})
          OR "mediaUrl" ILIKE ${wildcard}
        )
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
  },

  /**
   * Sidebar conversations: distinct roomIds with their most recent message,
   * plus unread counts.
   *
   * Two Postgres-specific gotchas baked into this query:
   *   1. `senderId` / `receiverId` are UUID columns, so the interpolated JS
   *      string must be cast to `uuid` — otherwise Postgres rejects the
   *      comparison with `operator does not exist: uuid = text` (42883).
   *   2. `messages.searchVector` is a generated `tsvector` column added by
   *      the initial migration but not declared on the Prisma model.
   *      `SELECT *` would drag it back and Prisma would fail to deserialise
   *      the tsvector into any known type. Enumerate the columns instead.
   */
  async conversationsForUser(userId) {
    const rows = await prisma.$queryRaw`
      SELECT DISTINCT ON ("roomId")
             id, "clientMessageId", "senderId", "receiverId", "roomId",
             "encryptedPayload", iv, "mediaUrl", "mediaType", thumbnail,
             "fileSize", status, "replyToMessageId", reactions,
             "editedAt", "deletedAt", "expiresAt", "createdAt", "updatedAt"
      FROM messages
      WHERE ("senderId" = ${userId}::uuid OR "receiverId" = ${userId}::uuid)
        AND "deletedAt" IS NULL
      ORDER BY "roomId", "createdAt" DESC
    `;

    const unread = await prisma.message.groupBy({
      by: ['roomId'],
      where: { receiverId: userId, status: { in: ['SENT', 'DELIVERED'] }, deletedAt: null },
      _count: { _all: true },
    });
    const unreadMap = new Map(unread.map((u) => [u.roomId, u._count._all]));

    return rows.map((row) => ({ ...row, unreadCount: unreadMap.get(row.roomId) ?? 0 }));
  },

  deleteExpired() {
    return prisma.message.findMany({
      where: { expiresAt: { lt: new Date() }, deletedAt: null },
      select: { id: true, roomId: true, senderId: true, receiverId: true },
    });
  },

  markManyExpired(ids) {
    return prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), encryptedPayload: '', iv: '' },
    });
  },
};
