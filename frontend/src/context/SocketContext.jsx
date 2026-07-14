import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { connectSocket, destroySocket, getSocket } from '../services/socketService.js';
import { useAuth } from './AuthContext.jsx';
import { SOCKET_EVENTS } from '../utils/constants.js';

const SocketContext = createContext(null);

/**
 * Owns the socket lifecycle. Connects when the user is authenticated,
 * disconnects on logout, and exposes a `readyState` for UI feedback.
 * Also broadcasts presence + typing events into a lightweight in-memory
 * pub-sub so downstream hooks can subscribe without re-registering listeners.
 */
export const SocketProvider = ({ children }) => {
  const { isAuthed, user } = useAuth();
  const [status, setStatus] = useState('idle');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthed) {
      destroySocket();
      socketRef.current = null;
      setStatus('idle');
      return;
    }

    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onError = (err) => {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.warn('[socket] connect_error', err?.message);
    };

    socket.on(SOCKET_EVENTS.CONNECT, onConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on('connect_error', onError);

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, onConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off('connect_error', onError);
    };
  }, [isAuthed, user?.id]);

  const value = useMemo(
    () => ({
      status,
      socket: socketRef.current,
      getSocket,
    }),
    [status],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
};
