import { z } from 'zod';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,32}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(USERNAME_PATTERN, 'Username must be 3-32 chars, letters/numbers/._'),
  email: z.string().trim().email('Invalid email').max(254),
  password: z
    .string()
    .regex(PASSWORD_PATTERN, 'Password must be 8-72 chars and include a letter and a digit'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional().default(true),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z
      .string()
      .regex(PASSWORD_PATTERN, 'Password must be 8-72 chars and include a letter and a digit'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from current',
  });
