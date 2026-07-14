import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { buildExpireMessagesJob, purgeExpiredRefreshTokens } from './expireMessages.js';

const HOURLY = '0 * * * *';

export const startCronJobs = (io) => {
  const jobs = [];
  jobs.push(
    cron.schedule(env.EXPIRY_CRON, buildExpireMessagesJob(io), { scheduled: true }),
  );
  jobs.push(cron.schedule(HOURLY, purgeExpiredRefreshTokens, { scheduled: true }));

  logger.info({ jobs: jobs.length, expiry: env.EXPIRY_CRON }, 'cron.started');
  return () => jobs.forEach((j) => j.stop());
};
