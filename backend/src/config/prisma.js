import { PrismaClient } from '@prisma/client';
import { isProd } from './env.js';
import { logger } from './logger.js';

const prisma = new PrismaClient({
  log: isProd
    ? [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }]
    : [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'info' },
      ],
});

prisma.$on('error', (event) => logger.error({ event }, 'prisma.error'));
prisma.$on('warn', (event) => logger.warn({ event }, 'prisma.warn'));

export { prisma };
