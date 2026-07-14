import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSocketEvent } from './useSocketEvent.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useChatStore } from '../store/chatStore.js';
import { messageService } from '../services/messageService.js';
import { deriveRoomKey, decryptText, encryptText } from '../utils/crypto.js';
import { emitWithAck } from '../services/socketService.js';
import { buildRoomId } from '../utils/roomId.js';
import { SOCKET_EVENTS, MESSAGE_STATUS } from '../utils/constants.js';

// A stable empty array reference — returning `[]` fresh from a Zustand
// selector causes React 19 to detect an infinite render loop.
const EMPTY_MESSAGES = Object.freeze([]);

/**
 * The single hook that drives an open conversation:
 *   - fetch initial history (paginated)
 *   - decrypt in place
 *   - subscribe to receive_message / status / edit / delete / reaction events
 *   - expose sendMessage / editMessage / deleteMessage / react / etc.
 */
export const useConversation = (peerId) => {
  const { user } = useAuth();
  const { socket, status: socketStatus } = useSocket();
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const keyRef = useRef(null);

  // `buildRoomId` throws when both ids are equal (you can't chat with
  // yourself). Return null instead so the whole hook — and the ChatPage it
  // drives — degrade gracefully instead of unmounting the tree.
  const roomId = useMemo(() => {
    if (!peerId || !user?.id || peerId === user.id) return null;
    return buildRoomId(user.id, peerId);
  }, [user?.id, peerId]);
  const messages = useChatStore((s) =>
    roomId ? s.messagesByRoom[roomId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES,
  );

  // Publish which conversation is on screen so the sidebar can zero its
  // unread indicator instantly, without waiting for a server round-trip.
  // Cleared on unmount (or when peer changes) so leaving the chat lets the
  // sidebar reflect any subsequent unread activity again.
  useEffect(() => {
    useChatStore.getState().setActivePeer(peerId ?? null);
    return () => {
      if (useChatStore.getState().activePeerId === peerId) {
        useChatStore.getState().setActivePeer(null);
      }
    };
  }, [peerId]);

  const {
    setMessages,
    prependMessages,
    appendMessages,
    addOptimistic,
    reconcileOptimistic,
    updateMessage,
    markStatus,
    softDeleteMessage,
    setReactions,
    setTyping,
  } = useChatStore.getState();

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    (async () => {
      setIsLoadingInitial(true);
      const key = await deriveRoomKey(roomId);
      if (cancelled) return;
      keyRef.current = key;

      const result = await messageService.history(peerId, { limit: 30 });
      const decrypted = await Promise.all(
        result.messages.map(async (m) => ({
          ...m,
          plaintext: await decryptText(key, m.encryptedPayload, m.iv),
        })),
      );
      if (cancelled) return;

      setMessages(roomId, decrypted);
      setNextCursor(result.nextCursor);
      setIsLoadingInitial(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, peerId]);

  // Join the socket room while this conversation is open
  useEffect(() => {
    if (!roomId || !socket || socketStatus !== 'connected') return undefined;
    emitWithAck(SOCKET_EVENTS.JOIN_ROOM, { roomId }).catch(() => {});
    return () => {
      emitWithAck(SOCKET_EVENTS.LEAVE_ROOM, { roomId }).catch(() => {});
    };
  }, [socket, socketStatus, roomId]);

  useSocketEvent(
    SOCKET_EVENTS.RECEIVE_MESSAGE,
    async ({ message }) => {
      if (message.roomId !== roomId) return;

      // Look up an existing optimistic bubble for this send (same device
      // that just called sendMessage). If found, we already have the correct
      // plaintext locally and can reconcile without re-decrypting.
      const store = useChatStore.getState();
      const existing = message.clientMessageId
        ? (store.messagesByRoom[message.roomId] ?? []).find(
            (m) => m.clientMessageId === message.clientMessageId,
          )
        : null;

      if (existing) {
        reconcileOptimistic(message.roomId, message.clientMessageId, message);
        return;
      }

      const key = keyRef.current ?? (await deriveRoomKey(message.roomId));
      const plaintext = await decryptText(key, message.encryptedPayload, message.iv);
      appendMessages(message.roomId, [{ ...message, plaintext }]);

      if (message.senderId !== user.id) {
        emitWithAck(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageIds: [message.id] }).catch(() => {});
      }
    },
    [roomId, user?.id],
  );

  useSocketEvent(SOCKET_EVENTS.MESSAGE_STATUS, ({ messageId, status, at }) => {
    if (!roomId) return;
    markStatus(roomId, messageId, status, at);
  });

  useSocketEvent(SOCKET_EVENTS.MESSAGE_UPDATED, async ({ message }) => {
    if (message.roomId !== roomId) return;
    const key = keyRef.current ?? (await deriveRoomKey(message.roomId));
    const plaintext = await decryptText(key, message.encryptedPayload, message.iv);
    updateMessage(message.roomId, message.id, { ...message, plaintext, editedAt: message.editedAt });
  });

  useSocketEvent(SOCKET_EVENTS.MESSAGE_DELETED, ({ messageId, roomId: r }) => {
    if (r !== roomId) return;
    softDeleteMessage(r, messageId);
  });

  useSocketEvent(SOCKET_EVENTS.REACTION_UPDATED, ({ messageId, reactions }) => {
    if (!roomId) return;
    setReactions(roomId, messageId, reactions);
  });

  useSocketEvent(SOCKET_EVENTS.TYPING, ({ userId, roomId: r, expiresAt }) => {
    if (r !== roomId) return;
    setTyping(r, userId, Boolean(expiresAt));
  });

  const sendMessage = useCallback(
    async ({ text, media, replyToMessageId, expiresInSeconds }) => {
      if (!roomId) return null;
      const key = keyRef.current ?? (await deriveRoomKey(roomId));
      const clientMessageId = uuidv4();
      const { encryptedPayload, iv } = await encryptText(key, text ?? '');

      const optimistic = {
        id: clientMessageId,
        clientMessageId,
        senderId: user.id,
        receiverId: peerId,
        roomId,
        encryptedPayload,
        iv,
        plaintext: text ?? '',
        mediaUrl: media?.secureUrl ?? null,
        mediaType: media?.resourceType ?? null,
        thumbnail: media?.thumbnail ?? null,
        fileSize: media?.bytes ?? null,
        status: MESSAGE_STATUS.PENDING,
        replyToMessageId: replyToMessageId ?? null,
        reactions: [],
        editedAt: null,
        deletedAt: null,
        expiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000).toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addOptimistic(roomId, optimistic);

      // Build the socket payload with only defined values — the backend zod
      // schema uses `.optional()` (no null), so passing `null` for e.g.
      // `expiresInSeconds` when the user didn't pick a timer would fail
      // validation with "Invalid payload".
      const payload = {
        clientMessageId,
        roomId,
        receiverId: peerId,
        encryptedPayload,
        iv,
      };
      if (media?.secureUrl) payload.mediaUrl = media.secureUrl;
      if (media?.resourceType) payload.mediaType = media.resourceType;
      if (media?.thumbnail) payload.thumbnailUrl = media.thumbnail;
      if (typeof media?.bytes === 'number') payload.fileSize = media.bytes;
      if (replyToMessageId) payload.replyToMessageId = replyToMessageId;
      if (expiresInSeconds) payload.expiresInSeconds = expiresInSeconds;

      try {
        const { message } = await emitWithAck(SOCKET_EVENTS.SEND_MESSAGE, payload);
        reconcileOptimistic(roomId, clientMessageId, { ...message, plaintext: text ?? '' });
        return message;
      } catch (err) {
        updateMessage(roomId, clientMessageId, { status: MESSAGE_STATUS.FAILED });
        throw err;
      }
    },
    [roomId, peerId, user?.id, addOptimistic, reconcileOptimistic, updateMessage],
  );

  // Optimistic mutators — apply the change locally first, emit to the server
  // after. The server's broadcast will overwrite with authoritative state,
  // but the actor sees the change instantly (no visible round-trip).

  const editMessage = useCallback(
    async (messageId, nextText) => {
      if (!roomId) return;
      const key = keyRef.current ?? (await deriveRoomKey(roomId));
      const { encryptedPayload, iv } = await encryptText(key, nextText);
      const store = useChatStore.getState();
      const previous = (store.messagesByRoom[roomId] ?? []).find((m) => m.id === messageId);
      updateMessage(roomId, messageId, {
        plaintext: nextText,
        encryptedPayload,
        iv,
        editedAt: new Date().toISOString(),
      });
      try {
        await emitWithAck(SOCKET_EVENTS.EDIT_MESSAGE, { messageId, encryptedPayload, iv });
      } catch (err) {
        if (previous) {
          updateMessage(roomId, messageId, {
            plaintext: previous.plaintext,
            encryptedPayload: previous.encryptedPayload,
            iv: previous.iv,
            editedAt: previous.editedAt,
          });
        }
        throw err;
      }
    },
    [roomId, updateMessage],
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      if (!roomId) return;
      const store = useChatStore.getState();
      const previous = (store.messagesByRoom[roomId] ?? []).find((m) => m.id === messageId);
      softDeleteMessage(roomId, messageId);
      try {
        await emitWithAck(SOCKET_EVENTS.DELETE_MESSAGE, { messageId });
      } catch (err) {
        if (previous) {
          updateMessage(roomId, messageId, {
            deletedAt: previous.deletedAt,
            encryptedPayload: previous.encryptedPayload,
            iv: previous.iv,
            plaintext: previous.plaintext,
          });
        }
        throw err;
      }
    },
    [roomId, softDeleteMessage, updateMessage],
  );

  const react = useCallback(
    async (messageId, emoji) => {
      if (!roomId || !user?.id) return;
      const store = useChatStore.getState();
      const previous = (store.messagesByRoom[roomId] ?? []).find((m) => m.id === messageId);
      const previousReactions = previous?.reactions ?? [];
      const alreadyMine = previousReactions.some(
        (r) => r.userId === user.id && r.emoji === emoji,
      );
      const optimistic = alreadyMine
        ? previousReactions
        : [...previousReactions, { emoji, userId: user.id, createdAt: new Date().toISOString() }];
      setReactions(roomId, messageId, optimistic);
      try {
        await emitWithAck(SOCKET_EVENTS.REACT_MESSAGE, { messageId, emoji });
      } catch (err) {
        setReactions(roomId, messageId, previousReactions);
        throw err;
      }
    },
    [roomId, user?.id, setReactions],
  );

  const removeReaction = useCallback(
    async (messageId, emoji) => {
      if (!roomId || !user?.id) return;
      const store = useChatStore.getState();
      const previous = (store.messagesByRoom[roomId] ?? []).find((m) => m.id === messageId);
      const previousReactions = previous?.reactions ?? [];
      const optimistic = previousReactions.filter(
        (r) => !(r.userId === user.id && r.emoji === emoji),
      );
      setReactions(roomId, messageId, optimistic);
      try {
        await emitWithAck(SOCKET_EVENTS.REMOVE_REACTION, { messageId, emoji });
      } catch (err) {
        setReactions(roomId, messageId, previousReactions);
        throw err;
      }
    },
    [roomId, user?.id, setReactions],
  );

  const loadMore = useCallback(async () => {
    if (!roomId || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const key = keyRef.current ?? (await deriveRoomKey(roomId));
      const result = await messageService.history(peerId, { cursor: nextCursor });
      const decrypted = await Promise.all(
        result.messages.map(async (m) => ({
          ...m,
          plaintext: await decryptText(key, m.encryptedPayload, m.iv),
        })),
      );
      prependMessages(roomId, decrypted);
      setNextCursor(result.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomId, peerId, nextCursor, isLoadingMore, prependMessages]);

  const markVisibleAsSeen = useCallback(
    (visibleMessageIds) => {
      if (!roomId || visibleMessageIds.length === 0) return;
      emitWithAck(SOCKET_EVENTS.MESSAGE_SEEN, { messageIds: visibleMessageIds }).catch(() => {});
    },
    [roomId],
  );

  return {
    roomId,
    messages,
    isLoadingInitial,
    isLoadingMore,
    hasMore: Boolean(nextCursor),
    sendMessage,
    editMessage,
    deleteMessage,
    react,
    removeReaction,
    loadMore,
    markVisibleAsSeen,
  };
};
