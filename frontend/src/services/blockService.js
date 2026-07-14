import { apiClient } from './apiClient.js';

export const blockService = {
  async list() {
    const { data } = await apiClient.get('/block');
    return data.blocked;
  },
  async block(userId) {
    await apiClient.post(`/block/${userId}`);
  },
  async unblock(userId) {
    await apiClient.delete(`/block/${userId}`);
  },
};
