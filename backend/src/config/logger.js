import pino from 'pino';
import { env, isProd } from './env.js';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  base: { service: 'chatapp-backend', env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.encryptedPayload',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
      },
});
