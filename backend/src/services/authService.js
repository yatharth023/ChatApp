import { userRepository } from '../repositories/userRepository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { ApiError } from '../utils/ApiError.js';
import { tokenService } from './tokenService.js';
import { toUserDto } from '../utils/dto.js';

export const authService = {
  async register({ username, email, password }, context = {}) {
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) throw ApiError.conflict('EMAIL_TAKEN', 'Email already registered');
    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) throw ApiError.conflict('USERNAME_TAKEN', 'Username already taken');

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ username, email, passwordHash });

    const tokens = await tokenService.issueTokenPair(user, context);
    return { user: toUserDto(user), ...tokens };
  },

  async login({ email, password }, context = {}) {
    const record = await userRepository.findByEmail(email);
    if (!record || record.deletedAt) {
      throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const ok = await verifyPassword(password, record.passwordHash);
    if (!ok) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');

    const tokens = await tokenService.issueTokenPair(record, context);
    return { user: toUserDto(record), ...tokens };
  },

  async refresh(rawRefreshToken, context = {}) {
    return tokenService.rotate(rawRefreshToken, context);
  },

  async logout(rawRefreshToken) {
    if (rawRefreshToken) await tokenService.revoke(rawRefreshToken);
  },

  async logoutEverywhere(userId) {
    await tokenService.revokeAll(userId);
    await userRepository.bumpTokenVersion(userId);
  },
};
