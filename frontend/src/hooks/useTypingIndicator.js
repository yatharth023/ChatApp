import { useCallback, useEffect, useRef } from 'react';
import { emitWithAck } from '../services/socketService.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import { useDebouncedCallback } from './useDebounce.js';

const START_THROTTLE_MS = 1500;
const STOP_TIMEOUT_MS = 3000;

/**
 * Emits `typing_start` at most once per 1.5 s and `typing_stop` 3 s after
 * the last keystroke. Cleans up on unmount.
 */
export const useTypingIndicator = (roomId) => {
  const lastStartRef = useRef(0);
  const stopTimerRef = useRef(null);

  const emitStop = useDebouncedCallback(async () => {
    if (!roomId) return;
    emitWithAck(SOCKET_EVENTS.TYPING_STOP, { roomId }).catch(() => {});
  }, STOP_TIMEOUT_MS);

  useEffect(
    () => () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (roomId) emitWithAck(SOCKET_EVENTS.TYPING_STOP, { roomId }).catch(() => {});
    },
    [roomId],
  );

  return useCallback(() => {
    if (!roomId) return;
    const now = Date.now();
    if (now - lastStartRef.current > START_THROTTLE_MS) {
      lastStartRef.current = now;
      emitWithAck(SOCKET_EVENTS.TYPING_START, { roomId }).catch(() => {});
    }
    emitStop();
  }, [roomId, emitStop]);
};
