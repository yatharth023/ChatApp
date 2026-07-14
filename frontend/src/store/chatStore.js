import { create } from 'zustand';

/**
 * Chat store — keeps realtime state that has to be shared across components
 * but doesn't belong in React Query cache (typing, presence, active room).
 * Messages themselves live in per-room slices so we can render huge history
 * cheaply and reconcile socket events without invalidating the whole cache.
 */
export const useChatStore = create((set, get) => ({
  activePeerId: null,
  setActivePeer: (peerId) => set({ activePeerId: peerId }),

  // messagesByRoom: Map<roomId, Message[]>  (ordered ascending by createdAt)
  messagesByRoom: {},

  setMessages: (roomId, messages) =>
    set((state) => ({
      messagesByRoom: { ...state.messagesByRoom, [roomId]: messages },
    })),

  appendMessages: (roomId, messages) =>
    set((state) => {
      const existing = state.messagesByRoom[roomId] ?? [];
      const seen = new Set(existing.map((m) => m.id));
      const merged = [...existing];
      for (const m of messages) if (!seen.has(m.id)) merged.push(m);
      merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: merged } };
    }),

  prependMessages: (roomId, messages) =>
    set((state) => {
      const existing = state.messagesByRoom[roomId] ?? [];
      const seen = new Set(existing.map((m) => m.id));
      const prepended = messages.filter((m) => !seen.has(m.id));
      const merged = [...prepended, ...existing];
      merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: merged } };
    }),

  addOptimistic: (roomId, message) =>
    set((state) => {
      const existing = state.messagesByRoom[roomId] ?? [];
      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: [...existing, message] } };
    }),

  reconcileOptimistic: (roomId, clientMessageId, serverMessage) =>
    set((state) => {
      const existing = state.messagesByRoom[roomId] ?? [];
      const next = existing.map((m) =>
        m.clientMessageId === clientMessageId ? { ...serverMessage, plaintext: m.plaintext } : m,
      );
      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: next } };
    }),

  updateMessage: (roomId, messageId, patch) =>
    set((state) => {
      const existing = state.messagesByRoom[roomId] ?? [];
      const next = existing.map((m) => (m.id === messageId ? { ...m, ...patch } : m));
      return { messagesByRoom: { ...state.messagesByRoom, [roomId]: next } };
    }),

  markStatus: (roomId, messageId, status, at) =>
    get().updateMessage(roomId, messageId, {
      status,
      ...(status === 'DELIVERED' ? { deliveredAt: at } : {}),
      ...(status === 'READ' ? { readAt: at } : {}),
    }),

  softDeleteMessage: (roomId, messageId) =>
    get().updateMessage(roomId, messageId, {
      deletedAt: new Date().toISOString(),
      encryptedPayload: '',
      plaintext: '',
    }),

  setReactions: (roomId, messageId, reactions) =>
    get().updateMessage(roomId, messageId, { reactions }),

  // typing indicators — { [roomId]: Set<userId> }
  typingByRoom: {},

  setTyping: (roomId, userId, isTyping) =>
    set((state) => {
      const prev = new Set(state.typingByRoom[roomId] ?? []);
      if (isTyping) prev.add(userId);
      else prev.delete(userId);
      return {
        typingByRoom: { ...state.typingByRoom, [roomId]: Array.from(prev) },
      };
    }),

  // presence — { [userId]: { isOnline, lastSeenAt } }
  presence: {},
  setPresence: (userId, patch) =>
    set((state) => ({
      presence: { ...state.presence, [userId]: { ...(state.presence[userId] ?? {}), ...patch } },
    })),
}));
