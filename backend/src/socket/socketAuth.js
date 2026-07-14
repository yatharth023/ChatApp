import { verifyAccessToken } from '../utils/tokens.js';
import { userRepository } from '../repositories/userRepository.js';

/**
 * Socket-level auth. Rejects the handshake if the JWT is missing/invalid or
 * the user has been deleted. `socket.user` becomes trusted state for handlers.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ??
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) return next(new Error('MISSING_TOKEN'));

    const claims = verifyAccessToken(token);
    const user = await userRepository.findById(claims.sub);
    if (!user || user.deletedAt) return next(new Error('USER_NOT_FOUND'));
    if (user.tokenVersion !== claims.tv) return next(new Error('TOKEN_REVOKED'));

    socket.user = { id: user.id, username: user.username };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new Error('TOKEN_EXPIRED'));
    return next(new Error('INVALID_TOKEN'));
  }
};
