import { env, isProd } from '../config/env.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

export const REFRESH_COOKIE = 'refresh_token';

export const buildRefreshCookieOptions = (rememberMe = true) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  domain: env.COOKIE_DOMAIN,
  path: '/api/auth',
  maxAge: rememberMe ? THIRTY_DAYS_MS : ONE_DAY_MS,
});

export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN,
    path: '/api/auth',
  });
};
