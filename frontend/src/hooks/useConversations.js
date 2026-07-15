import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { messageService } from '../services/messageService.js';
import { userService } from '../services/userService.js';
import { QUERY_KEYS, SOCKET_EVENTS } from '../utils/constants.js';
import { useSocketEvent } from './useSocketEvent.js';
import { useAuth } from '../context/AuthContext.jsx';
import { deriveRoomKey, decryptText } from '../utils/crypto.js';

/**
 * Decrypts a conversation's most recent message so the sidebar can preview
 * the real text instead of "🔒 Encrypted". Room keys are cached in
 * IndexedDB, so second-and-later loads are essentially free.
 */
const decryptLastMessagePreview = async (roomId, message) => {
  if (!message?.encryptedPayload || message.deletedAt) return null;
  try {
    const key = await deriveRoomKey(roomId);
    const text = await decryptText(key, message.encryptedPayload, message.iv);
    return text || null;
  } catch {
    return null;
  }
};

/**
 * Loads the sidebar conversation list, hydrates peer profiles, decrypts
 * last-message previews, and refetches whenever a realtime event changes
 * anything the sidebar renders.
 */
export const useConversations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: QUERY_KEYS.CONVERSATIONS,
    queryFn: async () => {
      const list = await messageService.conversations();
      return Promise.all(
        list.map(async (row) => {
          const [peer, lastMessagePlaintext] = await Promise.all([
            userService.profile(row.peerId).catch(() => null),
            decryptLastMessagePreview(row.roomId, row.lastMessage),
          ]);
          return { ...row, peer, lastMessagePlaintext };
        }),
      );
    },
    staleTime: 5_000,
    // Poll as a fallback for socket delivery gaps — the sidebar should
    // reflect new/unread messages within a few seconds even if the
    // realtime broadcast never arrives.
    refetchInterval: 6_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATIONS });

  useSocketEvent(SOCKET_EVENTS.RECEIVE_MESSAGE, () => invalidate());
  useSocketEvent(SOCKET_EVENTS.MESSAGE_STATUS, () => invalidate());
  useSocketEvent(SOCKET_EVENTS.MESSAGE_DELETED, () => invalidate());

  useEffect(() => {
    // Refetch when the user becomes active again after a period of hidden tab.
    const onVisible = () => {
      if (document.visibilityState === 'visible') invalidate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return query;
};
