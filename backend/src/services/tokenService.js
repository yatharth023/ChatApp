import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateJti,
} from '../utils/tokens.js';
import { hashToken, verifyToken } from '../utils/password.js';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const DURATION_UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
const durationToMs = (duration) => {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return Number(match[1]) * DURATION_UNITS[match[2]];
};

const buildRefreshExpiry = () => new Date(Date.now() + durationToMs(env.JWT_REFRESH_TTL));

export const tokenService = {
  async issueTokenPair(user, { userAgent, ip, deviceInfo } = {}) {
    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      tv: user.tokenVersion,
    });

    const jti = generateJti();
    const refreshToken = signRefreshToken({ sub: user.id, jti, tv: user.tokenVersion });
    const tokenHash = await hashToken(jti);
    const expiresAt = buildRefreshExpiry();

    await refreshTokenRepository.create({
      userId: user.id,
      jti,
      tokenHash,
      deviceInfo: deviceInfo ?? null,
      ip: ip ?? null,
      expiresAt,
    });

    await sessionRepository.create({
      userId: user.id,
      refreshJti: jti,
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    });

    return { accessToken, refreshToken, refreshExpiresAt: expiresAt };
  },

  async rotate(rawRefreshToken, { userAgent, ip } = {}) {
    let claims;
    try {
      claims = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw ApiError.unauthorized('INVALID_REFRESH', 'Invalid refresh token');
    }

    const stored = await refreshTokenRepository.findByJti(claims.jti);
    if (!stored) throw ApiError.unauthorized('REFRESH_REVOKED', 'Refresh token revoked');
    if (stored.expiresAt < new Date()) {
      await refreshTokenRepository.revoke(stored.jti).catch(() => {});
      throw ApiError.unauthorized('REFRESH_EXPIRED', 'Refresh token expired');
    }
    const matches = await verifyToken(claims.jti, stored.tokenHash);
    if (!matches) throw ApiError.unauthorized('REFRESH_MISMATCH', 'Refresh token mismatch');

    // Rotate: delete old, create new. This is single-use.
    await refreshTokenRepository.revoke(stored.jti);

    const nextJti = generateJti();
    const nextRefresh = signRefreshToken({ sub: claims.sub, jti: nextJti, tv: claims.tv });
    const nextHash = await hashToken(nextJti);
    const nextExpiry = buildRefreshExpiry();

    await refreshTokenRepository.create({
      userId: claims.sub,
      jti: nextJti,
      tokenHash: nextHash,
      deviceInfo: stored.deviceInfo,
      ip: ip ?? stored.ip,
      expiresAt: nextExpiry,
    });

    await sessionRepository.updateRefreshJti(stored.jti, nextJti).catch(async () => {
      await sessionRepository.create({
        userId: claims.sub,
        refreshJti: nextJti,
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      });
    });

    const accessToken = signAccessToken({
      sub: claims.sub,
      username: claims.username,
      tv: claims.tv,
    });

    return { accessToken, refreshToken: nextRefresh, refreshExpiresAt: nextExpiry };
  },

  async revoke(rawRefreshToken) {
    try {
      const claims = verifyRefreshToken(rawRefreshToken);
      await refreshTokenRepository.revoke(claims.jti).catch(() => {});
      await sessionRepository.revoke(claims.jti).catch(() => {});
    } catch {
      // Ignore — logout is best-effort
    }
  },

  async revokeAll(userId) {
    await refreshTokenRepository.revokeAllForUser(userId);
    await sessionRepository.revokeAllForUser(userId);
  },
};
