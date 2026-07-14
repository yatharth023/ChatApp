import { apiClient } from './apiClient.js';

export const userService = {
  async search(q, cursor) {
    const { data } = await apiClient.get('/users/search', { params: { q, cursor } });
    return data;
  },

  async profile(userId) {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data.user;
  },

  async updateProfile(patch) {
    const { data } = await apiClient.patch('/users/me', patch);
    return data.user;
  },

  async changePassword(payload) {
    await apiClient.patch('/users/me/password', payload);
  },

  async deleteAccount() {
    await apiClient.delete('/users/me');
  },
};
