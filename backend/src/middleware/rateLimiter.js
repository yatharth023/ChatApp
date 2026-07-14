import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Normalise the incoming client address so rate-limit keys are stable
 * regardless of whether Node hands us an IPv4-mapped IPv6 form.
 *   ::ffff:127.0.0.1  →  127.0.0.1
 *   ::1               →  127.0.0.1
 */
const normalizeIp = (ip) => {
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) return ip.slice('::ffff:'.length);
  if (ip === '::1') return '127.0.0.1';
  return ip;
};

/**
 * Build a limiter keyed by the authenticated user id when available, falling
 * back to a normalised client IP.
 *
 * `express-rate-limit@7` ships a runtime "validate" step that inspects the
 * `keyGenerator` output and throws `ERR_ERL_KEY_GEN_IPV6` for anything that
 * looks IPv6-shaped (including localhost). We normalise the IP ourselves
 * and disable the specific validators so the limiter can't derail requests.
 */
const buildLimiter = (max, windowMs, code) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { ip: false, xForwardedForHeader: false },
    keyGenerator: (req) => {
      if (req.user?.id) return `user:${req.user.id}`;
      const ip = req.ip ?? req.socket?.remoteAddress;
      return `ip:${normalizeIp(ip)}`;
    },
    handler: (_req, res) => {
      res.status(429).json({
        error: { code, message: 'Too many requests. Please slow down.' },
      });
    },
  });

export const globalLimiter = buildLimiter(env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS, 'RATE_LIMITED');
export const authLimiter = buildLimiter(env.LOGIN_RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS, 'AUTH_RATE_LIMITED');
