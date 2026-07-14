import axios from 'axios';
import { env } from '../config/env.js';
import { accessTokenStore } from '../utils/storage.js';

/**
 * Axios instance with two interceptor policies:
 *   1. Attach the in-memory access token to every request.
 *   2. On a single 401, invoke /auth/refresh and replay the original request.
 *
 * Concurrent 401s share one refresh promise so we don't stampede the server.
 */
export const apiClient = axios.create({
  baseURL: env.API_BASE,
  withCredentials: true,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = accessTokenStore.get();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;
let onUnauthorized = null;

export const setOnUnauthorized = (fn) => {
  onUnauthorized = fn;
};

/**
 * Deduplicated refresh — concurrent callers share a single in-flight promise
 * so we never race two POST /auth/refresh requests against each other.
 * Refresh tokens are rotated single-use, so a race would revoke the first
 * response's new token before the second call finishes, cascading into a
 * 401 → guest → redirect loop at boot.
 *
 * Exported so authService.refresh() can use the same dedup instead of
 * making its own axios call (which used to break AuthProvider.bootstrap
 * under React StrictMode's mount → unmount → mount cycle).
 */
export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${env.API_BASE}/auth/refresh`,
        {},
        { withCredentials: true, timeout: 10_000 },
      )
      .then((res) => {
        accessTokenStore.set(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    const isAuthRoute = config.url?.startsWith('/auth/');
    if (response.status === 401 && !config._retried && !isAuthRoute) {
      config._retried = true;
      try {
        const nextToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${nextToken}`;
        return apiClient(config);
      } catch (err) {
        accessTokenStore.clear();
        onUnauthorized?.(err);
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  },
);
