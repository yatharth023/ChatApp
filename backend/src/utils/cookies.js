import { env, isProd } from '../config/env.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

export const REFRESH_COOKIE = 'refresh_token';

/**
 * In production the frontend and backend live on different domains
 * (Vercel + Render, for example). Browsers will not send a
 * `SameSite=Strict` cookie across sites, so the refresh cookie has to
 * relax to `SameSite=None; Secure` in prod. In dev everything is served
 * from a single Vite origin, so we keep Strict for defense in depth.
 *
 * `Domain` is only set when explicitly provided in the environment —
 * omitting it makes the browser scope the cookie to the exact response
 * host, which is what you want for a cross-origin API.
 */
const shared = () => {
  const opts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    path: '/api/auth',
  };
  if (env.COOKIE_DOMAIN) opts.domain = env.COOKIE_DOMAIN;
  return opts;
};

export const buildRefreshCookieOptions = (rememberMe = true) => ({
  ...shared(),
  maxAge: rememberMe ? THIRTY_DAYS_MS : ONE_DAY_MS,
});

export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, shared());
};
