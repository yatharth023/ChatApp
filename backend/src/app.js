import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { env, isProd, isTest } from './config/env.js';
import { logger } from './config/logger.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { globalLimiter } from './middleware/rateLimiter.js';

export const buildApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Normalise once: browsers never include a trailing slash on the Origin
  // header, so a `.env` value like `https://foo.vercel.app/` would silently
  // never match. Strip trailing slashes on both sides before comparing.
  const stripSlash = (s) => s.replace(/\/+$/, '');
  const origins = env.CORS_ORIGIN.split(',').map((o) => stripSlash(o.trim())).filter(Boolean);
  const allowAny = origins.includes('*');
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin / server-to-server / curl → no Origin header.
        if (!origin) return cb(null, true);
        if (allowAny || origins.includes(stripSlash(origin))) return cb(null, true);
        // Origin not allowed: skip CORS headers instead of throwing, so
        // the request still processes and the browser rejects cleanly
        // (avoiding a 500 that masks the real cause).
        logger.warn({ origin, allowed: origins }, 'cors.originRejected');
        return cb(null, false);
      },
      credentials: true,
      exposedHeaders: ['x-request-id'],
    }),
  );

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  if (!isTest) {
    app.use(
      morgan(isProd ? 'combined' : 'dev', {
        stream: { write: (msg) => logger.info(msg.trim()) },
      }),
    );
  }

  app.use(globalLimiter);
  app.use(env.API_PREFIX, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
