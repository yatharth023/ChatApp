import { apiClient } from './apiClient.js';

export const friendshipService = {
  async list() {
    const { data } = await apiClient.get('/friends');
    return data.friends;
  },

  async incoming() {
    const { data } = await apiClient.get('/friends/requests/incoming');
    return data.incoming;
  },

  async outgoing() {
    const { data } = await apiClient.get('/friends/requests/outgoing');
    return data.outgoing;
  },

  async sendRequest(userId) {
    const { data } = await apiClient.post(`/friends/request/${userId}`);
    return data.status;
  },

  async accept(userId) {
    const { data } = await apiClient.post(`/friends/accept/${userId}`);
    return data.status;
  },

  async decline(userId) {
    await apiClient.post(`/friends/decline/${userId}`);
  },

  async cancel(userId) {
    await apiClient.post(`/friends/cancel/${userId}`);
  },

  async remove(userId) {
    await apiClient.delete(`/friends/${userId}`);
  },
};
