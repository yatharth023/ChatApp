import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

export const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_COST);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

/**
 * Bcrypt is used for refresh-token hashing as well, so revoked tokens
 * can never be replayed even if the DB is exfiltrated. Cost 8 here —
 * refresh tokens are already high-entropy (256 bits) so we optimise for latency.
 */
export const hashToken = (raw) => bcrypt.hash(raw, 8);
export const verifyToken = (raw, hash) => bcrypt.compare(raw, hash);
