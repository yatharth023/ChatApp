import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../services/authService.js';
import { userService } from '../services/userService.js';
import {
  REFRESH_COOKIE,
  buildRefreshCookieOptions,
  clearRefreshCookie,
} from '../utils/cookies.js';
import { ApiError } from '../utils/ApiError.js';

const contextOf = (req) => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
  deviceInfo: req.headers['x-device-info'] ?? null,
});

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register(req.body, contextOf(req));
    res.cookie(REFRESH_COOKIE, refreshToken, buildRefreshCookieOptions(true));
    res.status(201).json({ user, accessToken });
  }),

  login: asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body, contextOf(req));
    res.cookie(REFRESH_COOKIE, refreshToken, buildRefreshCookieOptions(req.body.rememberMe));
    res.json({ user, accessToken });
  }),

  refresh: asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw ApiError.unauthorized('MISSING_REFRESH', 'Missing refresh token');
    const { accessToken, refreshToken } = await authService.refresh(raw, contextOf(req));
    res.cookie(REFRESH_COOKIE, refreshToken, buildRefreshCookieOptions(true));
    res.json({ accessToken });
  }),

  logout: asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    await authService.logout(raw);
    clearRefreshCookie(res);
    res.status(204).end();
  }),

  logoutAll: asyncHandler(async (req, res) => {
    await authService.logoutEverywhere(req.user.id);
    clearRefreshCookie(res);
    res.status(204).end();
  }),

  me: asyncHandler(async (req, res) => {
    const user = await userService.me(req.user.id);
    res.json({ user });
  }),
};
