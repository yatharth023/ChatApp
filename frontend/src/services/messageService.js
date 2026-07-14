import { apiClient } from './apiClient.js';

export const messageService = {
  async conversations() {
    const { data } = await apiClient.get('/messages/conversations');
    return data.conversations;
  },

  async history(peerId, { cursor, limit = 30 } = {}) {
    const { data } = await apiClient.get('/messages/history', {
      params: { peerId, cursor, limit },
    });
    return data;
  },

  async search(peerId, q, limit = 20) {
    const { data } = await apiClient.get('/messages/search', {
      params: { peerId, q, limit },
    });
    return data;
  },
};
