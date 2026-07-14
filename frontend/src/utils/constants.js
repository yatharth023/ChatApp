export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
});

export const MESSAGE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
});

export const EXPIRY_OPTIONS = [
  { label: 'Never', seconds: null },
  { label: '5 min', seconds: 300 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '1 week', seconds: 604800 },
];

export const SOCKET_EVENTS = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  READY: 'ready',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  MESSAGE_STATUS: 'message_status',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_SEEN: 'message_seen',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  TYPING: 'typing',
  EDIT_MESSAGE: 'edit_message',
  DELETE_MESSAGE: 'delete_message',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_DELETED: 'message_deleted',
  REACT_MESSAGE: 'react_message',
  REMOVE_REACTION: 'remove_reaction',
  REACTION_UPDATED: 'reaction_updated',
  FETCH_HISTORY: 'fetch_history',
  HISTORY_LOADED: 'history_loaded',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  LAST_SEEN: 'last_seen',
  FRIEND_REQUEST_RECEIVED: 'friend_request_received',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  FRIEND_REQUEST_CANCELLED: 'friend_request_cancelled',
  FRIEND_REMOVED: 'friend_removed',
  ERROR: 'error',
});

export const FRIEND_STATUS = Object.freeze({
  NONE: 'none',
  PENDING_INCOMING: 'pending_incoming',
  PENDING_OUTGOING: 'pending_outgoing',
  ACCEPTED: 'accepted',
  SELF: 'self',
});

export const QUERY_KEYS = Object.freeze({
  ME: ['auth', 'me'],
  CONVERSATIONS: ['messages', 'conversations'],
  BLOCKED: ['block', 'list'],
  FRIENDS: ['friends', 'list'],
  FRIENDS_INCOMING: ['friends', 'incoming'],
  FRIENDS_OUTGOING: ['friends', 'outgoing'],
  USER_SEARCH: (q, cursor) => ['users', 'search', q, cursor ?? null],
  PROFILE: (id) => ['users', 'profile', id],
  HISTORY: (peerId) => ['messages', 'history', peerId],
});
