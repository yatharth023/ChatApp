import { logger } from '../../config/logger.js';
import { socketSchemas } from '../../validators/socketValidator.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Wraps a raw socket event with:
 *   - zod validation for the payload
 *   - typed acknowledgement responses
 *   - structured logging (with the full stack trace on unknown errors, so
 *     production issues aren't hidden behind a generic "Unexpected socket
 *     error" ack)
 *   - centralised error handling
 *
 * The wrapped fn receives (payload, ctx) where ctx = { socket, io, user }.
 */
export const wrapEvent = (event, fn) => {
  const schema = socketSchemas[event];

  return (io, socket) => async (rawPayload, ack) => {
    const respond = (result) => {
      if (typeof ack === 'function') ack(result);
    };

    try {
      const payload = schema ? schema.parse(rawPayload ?? {}) : rawPayload;
      const result = await fn(payload, { socket, io, user: socket.user });
      respond({ ok: true, ...(result && typeof result === 'object' ? result : { data: result }) });
    } catch (err) {
      let errBody;
      if (err instanceof ApiError) {
        errBody = { code: err.code, message: err.message, details: err.details };
        logger.warn({ event, userId: socket.user?.id, code: err.code }, 'socket.apiError');
      } else if (err?.errors) {
        errBody = { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: err.errors };
        logger.warn({ event, userId: socket.user?.id, details: err.errors }, 'socket.validationError');
      } else {
        // Something unexpected — most often a Redis timeout, Prisma error,
        // or a bug in a handler. Log the FULL stack so we can debug from
        // Render's logs, and forward the raw message to the client so users
        // aren't left staring at "Unexpected socket error" with no context.
        errBody = {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'Unexpected socket error',
          details: err?.name ? { name: err.name } : undefined,
        };
        logger.error(
          {
            event,
            userId: socket.user?.id,
            err: {
              name: err?.name,
              message: err?.message,
              code: err?.code,
              stack: err?.stack?.split('\n').slice(0, 6),
            },
          },
          'socket.internalError',
        );
      }

      respond({ ok: false, error: errBody });
      socket.emit('error', errBody);
    }
  };
};
