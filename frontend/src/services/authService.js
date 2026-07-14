import { apiClient, refreshAccessToken } from './apiClient.js';
import { accessTokenStore } from '../utils/storage.js';

export const authService = {
  async register(payload) {
    const { data } = await apiClient.post('/auth/register', payload);
    accessTokenStore.set(data.accessToken);
    return data.user;
  },

  async login(payload) {
    const { data } = await apiClient.post('/auth/login', payload);
    accessTokenStore.set(data.accessToken);
    return data.user;
  },

  async me() {
    const { data } = await apiClient.get('/auth/me');
    return data.user;
  },

  // Routes through the shared refresh promise in apiClient. Concurrent
  // callers (e.g. React StrictMode double-invoking AuthProvider.bootstrap
  // in dev) piggyback on one in-flight request, avoiding the token-rotation
  // race that used to redirect users away from their intended URL on load.
  async refresh() {
    return refreshAccessToken();
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      accessTokenStore.clear();
    }
  },

  async logoutAll() {
    try {
      await apiClient.post('/auth/logout-all');
    } finally {
      accessTokenStore.clear();
    }
  },
};
