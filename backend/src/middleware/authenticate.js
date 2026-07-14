import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { userRepository } from '../repositories/userRepository.js';

/**
 * Validates the Authorization header, verifies the JWT signature,
 * and checks the user's `tokenVersion` matches the token — supporting
 * "logout everywhere" without a distributed blacklist.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('MISSING_TOKEN', 'Missing bearer token');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw ApiError.unauthorized('MISSING_TOKEN', 'Missing bearer token');

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('TOKEN_EXPIRED', 'Access token expired');
    }
    throw ApiError.unauthorized('INVALID_TOKEN', 'Invalid access token');
  }

  const user = await userRepository.findById(claims.sub);
  if (!user || user.deletedAt) {
    throw ApiError.unauthorized('USER_NOT_FOUND', 'User no longer exists');
  }
  if (user.tokenVersion !== claims.tv) {
    throw ApiError.unauthorized('TOKEN_REVOKED', 'Token has been revoked');
  }

  req.user = { id: user.id, username: user.username, email: user.email, tokenVersion: user.tokenVersion };
  next();
});
