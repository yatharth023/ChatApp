import { z } from 'zod';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,32}$/;

export const updateProfileSchema = z
  .object({
    username: z.string().trim().regex(USERNAME_PATTERN).optional(),
    bio: z.string().trim().max(280).optional(),
    avatarUrl: z.string().url().max(1024).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const searchUsersSchema = z.object({
  q: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().uuid().optional(),
});

export const userIdParamSchema = z.object({ userId: z.string().uuid() });
