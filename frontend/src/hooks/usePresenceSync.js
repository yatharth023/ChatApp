import { useChatStore } from '../store/chatStore.js';
import { useSocketEvent } from './useSocketEvent.js';
import { SOCKET_EVENTS } from '../utils/constants.js';

/**
 * Mirrors `user_online` / `user_offline` / `last_seen` server events into
 * the local presence slice so any component can render peer status from
 * a single source.
 */
export const usePresenceSync = () => {
  const setPresence = useChatStore((s) => s.setPresence);

  useSocketEvent(SOCKET_EVENTS.USER_ONLINE, ({ userId, at }) =>
    setPresence(userId, { isOnline: true, lastSeenAt: at }),
  );
  useSocketEvent(SOCKET_EVENTS.USER_OFFLINE, ({ userId, at }) =>
    setPresence(userId, { isOnline: false, lastSeenAt: at }),
  );
  useSocketEvent(SOCKET_EVENTS.LAST_SEEN, ({ userId, at }) =>
    setPresence(userId, { lastSeenAt: at }),
  );
};
