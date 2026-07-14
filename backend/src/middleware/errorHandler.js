import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

const zodToDetails = (err) =>
  err.errors.map((e) => ({ path: e.path.join('.'), message: e.message, code: e.code }));

const prismaKnownToResponse = (err) => {
  switch (err.code) {
    case 'P2002':
      return {
        status: 409,
        body: {
          code: 'UNIQUE_CONSTRAINT',
          message: 'Resource already exists',
          details: { fields: err.meta?.target },
        },
      };
    case 'P2003':
      return {
        status: 409,
        body: {
          code: 'FOREIGN_KEY',
          message: 'Related resource is missing',
          details: { field: err.meta?.field_name },
        },
      };
    case 'P2021':
    case 'P2022':
      return {
        status: 500,
        body: {
          code: 'DB_NOT_MIGRATED',
          message:
            'Database is not migrated. Run `npx prisma migrate deploy` in the backend directory.',
        },
      };
    case 'P2025':
      return {
        status: 404,
        body: { code: 'NOT_FOUND', message: 'Resource not found' },
      };
    default:
      return null;
  }
};

const buildFallback = (err) => {
  const base = { code: 'INTERNAL_ERROR', message: 'Internal server error' };
  if (isProd) return base;
  return {
    ...base,
    message: err.message || base.message,
    details: {
      name: err.name,
      code: err.code ?? null,
      stack: err.stack?.split('\n').slice(0, 12),
    },
  };
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    logger.warn({ err, path: req.path, code: err.code }, 'api.error');
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request failed validation',
        details: zodToDetails(err),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaKnownToResponse(err);
    if (mapped) {
      logger.warn({ err, code: err.code, path: req.path }, 'prisma.knownError');
      return res.status(mapped.status).json({ error: mapped.body });
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error({ err }, 'prisma.initError');
    return res.status(500).json({
      error: {
        code: 'DB_INIT_ERROR',
        message:
          'Cannot connect to database. Check DATABASE_URL and that PostgreSQL is running.',
      },
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error({ err }, 'prisma.validationError');
    return res.status(500).json({
      error: {
        code: 'DB_QUERY_INVALID',
        message: isProd ? 'Invalid database query' : err.message,
      },
    });
  }

  if (err?.message?.startsWith('Origin ') && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({
      error: { code: 'CORS_ORIGIN_NOT_ALLOWED', message: err.message },
    });
  }

  logger.error({ err, path: req.path }, 'unhandled.error');
  return res.status(500).json({ error: buildFallback(err) });
};
