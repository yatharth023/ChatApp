import { z } from 'zod';

const uuid = z.string().uuid();
const roomId = z.string().regex(/^[0-9a-f-]+_[0-9a-f-]+$/i);

export const socketSchemas = {
  join_room: z.object({ roomId }),
  leave_room: z.object({ roomId }),

  send_message: z.object({
    clientMessageId: uuid,
    roomId,
    receiverId: uuid,
    encryptedPayload: z.string().min(1).max(64_000),
    iv: z.string().min(1).max(256),
    mediaUrl: z.string().url().max(1024).optional(),
    mediaType: z.enum(['image', 'video', 'audio', 'file']).optional(),
    thumbnailUrl: z.string().url().max(1024).optional(),
    fileSize: z.number().int().min(0).max(200 * 1024 * 1024).optional(),
    replyToMessageId: uuid.optional(),
    expiresInSeconds: z
      .number()
      .int()
      .refine((n) => [300, 3600, 86400, 604800].includes(n), 'Unsupported expiry')
      .optional(),
  }),

  typing_start: z.object({ roomId }),
  typing_stop: z.object({ roomId }),

  message_delivered: z.object({ messageIds: z.array(uuid).min(1).max(100) }),
  message_seen: z.object({ messageIds: z.array(uuid).min(1).max(100) }),

  edit_message: z.object({
    messageId: uuid,
    encryptedPayload: z.string().min(1).max(64_000),
    iv: z.string().min(1).max(256),
  }),

  delete_message: z.object({ messageId: uuid }),

  react_message: z.object({ messageId: uuid, emoji: z.string().min(1).max(24) }),
  remove_reaction: z.object({ messageId: uuid, emoji: z.string().min(1).max(24) }),

  fetch_history: z.object({
    roomId,
    cursor: z.string().min(8).max(128).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
};
