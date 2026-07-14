import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

/**
 * Subscribes a component to a socket event.
 *
 * The handler is stored in a ref that is refreshed on every render, so the
 * *listener* we attach to the socket only re-registers when the underlying
 * socket or event name changes. This is critical: without the ref-relay,
 * the listener closure captures whatever `roomId` / `user` etc. were in
 * scope the first time the effect ran, and every subsequent event would
 * bail out because those values are stale. (That's why reactions / edits
 * / deletes previously seemed to only update after a page refresh.)
 */
export const useSocketEvent = (event, handler) => {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (...args) => handlerRef.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
};
