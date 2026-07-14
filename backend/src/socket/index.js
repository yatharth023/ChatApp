import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env, isProd } from '../config/env.js';
import { logger } from '../config/logger.js';
import { redisPub, redisSub } from '../config/redis.js';
import { socketAuthMiddleware } from './socketAuth.js';
import { registerRoomHandlers } from './handlers/roomHandler.js';
import { registerMessageHandlers } from './handlers/messageHandler.js';
import { registerTypingHandlers } from './handlers/typingHandler.js';
import { registerPresenceHandlers } from './handlers/presenceHandler.js';

let io;

export const initSocket = (httpServer) => {
  const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    path: '/socket.io',
    // WebSocket only per spec — no long-polling fallback
    transports: ['websocket'],
    cors: {
      origin: origins,
      credentials: true,
    },
    // Aggressive timeouts to catch dead peers early
    pingTimeout: 20_000,
    pingInterval: 25_000,
    maxHttpBufferSize: 1e6,
  });

  // Redis pub/sub adapter — required for horizontal Socket.io scale so that
  // an emit on one node reaches sockets connected to a different node.
  if (isProd) {
    io.adapter(createAdapter(redisPub, redisSub));
    logger.info('socket.adapter.redis');
  }

  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    logger.info({ userId: socket.user.id, socketId: socket.id }, 'socket.connected');

    await registerPresenceHandlers(io, socket);
    registerRoomHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerMessageHandlers(io, socket);

    socket.emit('ready', { userId: socket.user.id, at: new Date().toISOString() });
  });

  io.engine.on('connection_error', (err) => {
    logger.warn(
      { code: err.code, message: err.message, req: err.req?.url },
      'socket.connection_error',
    );
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io has not been initialised');
  return io;
};

export const shutdownSocket = async () => {
  if (!io) return;
  await new Promise((resolve) => io.close(resolve));
  logger.info('socket.closed');
};
