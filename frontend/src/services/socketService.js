import { io as createSocket } from 'socket.io-client';
import { env } from '../config/env.js';
import { accessTokenStore } from '../utils/storage.js';

/**
 * Singleton Socket.io client. Reconnects with exponential backoff and
 * automatically re-authenticates using the current in-memory access token.
 */
let socket = null;

const buildSocket = () =>
  createSocket(env.SOCKET_URL || undefined, {
    path: '/socket.io',
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
    autoConnect: false,
    auth: (cb) => cb({ token: accessTokenStore.get() ?? '' }),
  });

export const getSocket = () => {
  if (!socket) socket = buildSocket();
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

export const destroySocket = () => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

/**
 * Wraps `socket.emit` with a Promise so callers can `await` acknowledgements.
 * Rejects on timeout or when the server returns `{ ok: false }`.
 */
export const emitWithAck = (event, payload, timeoutMs = 10_000) =>
  new Promise((resolve, reject) => {
    const s = getSocket();
    if (!s.connected) return reject(new Error('Socket not connected'));

    const timer = setTimeout(() => reject(new Error(`Ack timeout on ${event}`)), timeoutMs);
    s.emit(event, payload, (response) => {
      clearTimeout(timer);
      if (response?.ok) resolve(response);
      else reject(Object.assign(new Error(response?.error?.message ?? 'Socket error'), {
        code: response?.error?.code,
        details: response?.error?.details,
      }));
    });
  });
