import { logger } from '../../config/logger.js';
import { socketSchemas } from '../../validators/socketValidator.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Wraps a raw socket event with:
 *   - zod validation for the payload
 *   - typed acknowledgement responses
 *   - structured logging
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
      const errBody =
        err instanceof ApiError
          ? { code: err.code, message: err.message, details: err.details }
          : err?.errors
            ? { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: err.errors }
            : { code: 'INTERNAL_ERROR', message: 'Unexpected socket error' };

      logger.warn(
        { event, userId: socket.user?.id, err: errBody },
        'socket.eventError',
      );
      respond({ ok: false, error: errBody });
      socket.emit('error', errBody);
    }
  };
};
