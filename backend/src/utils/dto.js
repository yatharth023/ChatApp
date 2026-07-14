/**
 * DTO mappers convert Prisma rows into the public shape returned to clients.
 * Kept centralised so socket + REST responses stay in sync.
 */

export const toUserDto = (user) =>
  user
    ? {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
        createdAt: user.createdAt,
      }
    : null;

export const toPublicUserDto = (user) =>
  user
    ? {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
      }
    : null;

export const toMessageDto = (m) =>
  m
    ? {
        id: m.id,
        clientMessageId: m.clientMessageId,
        senderId: m.senderId,
        receiverId: m.receiverId,
        roomId: m.roomId,
        encryptedPayload: m.encryptedPayload,
        iv: m.iv,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        thumbnail: m.thumbnail,
        fileSize: m.fileSize,
        status: m.status,
        replyToMessageId: m.replyToMessageId,
        reactions: m.reactions ?? [],
        editedAt: m.editedAt,
        deletedAt: m.deletedAt,
        expiresAt: m.expiresAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    : null;
