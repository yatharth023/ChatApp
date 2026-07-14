import { z } from 'zod';

const MEDIA_TYPES = ['image', 'video', 'audio', 'file'];
const EXPIRY_ALLOWLIST = [300, 3600, 86400, 604800];

const uuid = z.string().uuid();
const cuidOrUuid = z.string().min(8).max(128);

export const sendMessageSchema = z
  .object({
    clientMessageId: uuid,
    receiverId: uuid,
    encryptedPayload: z.string().min(1).max(64_000),
    iv: z.string().min(1).max(256),
    mediaUrl: z.string().url().max(1024).optional(),
    mediaType: z.enum(MEDIA_TYPES).optional(),
    thumbnailUrl: z.string().url().max(1024).optional(),
    fileSize: z.number().int().min(0).max(200 * 1024 * 1024).optional(),
    replyToMessageId: uuid.optional(),
    expiresInSeconds: z
      .number()
      .int()
      .refine((n) => EXPIRY_ALLOWLIST.includes(n), 'Unsupported expiry')
      .optional(),
  })
  .refine(
    (m) => m.encryptedPayload.length > 0 || m.mediaUrl,
    'Message must include text or media',
  );

export const historyQuerySchema = z.object({
  peerId: uuid,
  cursor: cuidOrUuid.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const searchQuerySchema = z.object({
  peerId: uuid,
  q: z.string().trim().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const messageIdParamSchema = z.object({ messageId: uuid });
