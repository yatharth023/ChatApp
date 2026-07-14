import http from 'node:http';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { closeRedis } from './config/redis.js';
import { initSocket, shutdownSocket } from './socket/index.js';
import { startCronJobs } from './cron/index.js';

const app = buildApp();
const server = http.createServer(app);
const io = initSocket(server);
const stopCron = startCronJobs(io);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'server.listening');
});

const shutdown = async (signal) => {
  logger.warn({ signal }, 'server.shutdown.begin');
  server.close(() => logger.info('server.http.closed'));
  stopCron();
  await shutdownSocket();
  await prisma.$disconnect();
  await closeRedis();
  logger.info('server.shutdown.done');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.fatal({ reason }, 'unhandledRejection'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  shutdown('uncaughtException');
});
