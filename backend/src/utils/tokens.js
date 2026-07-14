import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const ACCESS_OPTS = { expiresIn: env.JWT_ACCESS_TTL, algorithm: 'HS256' };
const REFRESH_OPTS = { expiresIn: env.JWT_REFRESH_TTL, algorithm: 'HS256' };

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, ACCESS_OPTS);

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, REFRESH_OPTS);

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });

/**
 * Cryptographically secure opaque id used as the refresh token's `jti` claim.
 * We store bcrypt(jti) server-side so the raw token remains unrecoverable.
 */
export const generateJti = () => randomBytes(32).toString('hex');
