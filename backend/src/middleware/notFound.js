import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) =>
  next(ApiError.notFound('ROUTE_NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
