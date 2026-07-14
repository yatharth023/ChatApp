/**
 * Domain error thrown by services / controllers.
 * Carries an HTTP status, a stable machine code, and optional structured details.
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(code, message, details) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(code = 'UNAUTHORIZED', message = 'Authentication required') {
    return new ApiError(401, code, message);
  }
  static forbidden(code = 'FORBIDDEN', message = 'Not allowed') {
    return new ApiError(403, code, message);
  }
  static notFound(code = 'NOT_FOUND', message = 'Resource not found') {
    return new ApiError(404, code, message);
  }
  static conflict(code, message) {
    return new ApiError(409, code, message);
  }
  static unprocessable(code, message, details) {
    return new ApiError(422, code, message, details);
  }
  static tooMany(code = 'RATE_LIMITED', message = 'Too many requests') {
    return new ApiError(429, code, message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
