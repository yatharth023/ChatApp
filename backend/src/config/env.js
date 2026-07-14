import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api'),

  CORS_ORIGIN: z.string().min(1),
  COOKIE_DOMAIN: z.string().min(1).default('localhost'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('chatapp'),
  CLOUDINARY_UPLOAD_PRESET: z.string().default('chatapp-media'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(8),

  EXPIRY_CRON: z.string().default('*/1 * * * *'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.errors
    .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${message}`);
}

export const env = Object.freeze(parsed.data);
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
