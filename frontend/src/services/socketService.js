import { io as createSocket } from 'socket.io-client';
import { env } from '../config/env.js';
import { accessTokenStore } from '../utils/storage.js';

/**
 * Singleton Socket.io client. Reconnects with exponential backoff and
 * automatically re-authenticates using the current in-memory access token.
 */
let socket = null;

/**
 * Resolves the origin the socket should connect to.
 *   1. Explicit `VITE_SOCKET_URL` wins.
 *   2. Otherwise derive from `VITE_API_BASE` by stripping the `/api` suffix,
 *      but only when it's an absolute URL. This lets a single env var
 *      (`VITE_API_BASE=https://api.example.com/api`) configure both the REST
 *      client and the socket in production.
 *   3. In dev (`VITE_API_BASE=/api`), fall through to `undefined` so
 *      socket.io connects to the current origin and Vite's proxy handles it.
 */
const resolveSocketOrigin = () => {
  if (env.SOCKET_URL) return env.SOCKET_URL;
  if (env.API_BASE && /^https?:\/\//i.test(env.API_BASE)) {
    return env.API_BASE.replace(/\/api\/?$/, '');
  }
  return undefined;
};

const buildSocket = () =>
  createSocket(resolveSocketOrigin(), {
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
 * Rejects on timeout, when the socket is disconnected, or when the server
 * returns `{ ok: false }`. If the socket is disconnected we wait briefly for
 * a reconnect before giving up — a common case is that a background tab
 * threw its socket away and the user immediately types a message on
 * refocus, before the reconnect has finished.
 */
export const emitWithAck = (event, payload, timeoutMs = 10_000) =>
  new Promise((resolve, reject) => {
    const s = getSocket();

    const send = () => {
      const timer = setTimeout(
        () => reject(new Error(`No response from server (${event} timed out)`)),
        timeoutMs,
      );
      s.emit(event, payload, (response) => {
        clearTimeout(timer);
        if (response?.ok) resolve(response);
        else
          reject(
            Object.assign(new Error(response?.error?.message ?? 'The server rejected this action'), {
              code: response?.error?.code,
              details: response?.error?.details,
            }),
          );
      });
    };

    if (s.connected) return send();

    // Not connected — wait up to 3s for reconnect before giving up.
    const waitTimer = setTimeout(() => {
      s.off('connect', onConnect);
      reject(
        new Error(
          "Can't reach the chat server. Check your connection and try again.",
        ),
      );
    }, 3000);
    const onConnect = () => {
      clearTimeout(waitTimer);
      send();
    };
    s.once('connect', onConnect);
    if (!s.connecting) s.connect();
  });
