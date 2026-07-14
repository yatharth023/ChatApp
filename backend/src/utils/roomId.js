/**
 * Deterministic 1-on-1 room id.
 * Sorting the two user ids before joining guarantees both peers produce
 * the same id regardless of who initiates the conversation.
 */
export const buildRoomId = (a, b) => {
  if (!a || !b) throw new Error('buildRoomId requires two user ids');
  if (a === b) throw new Error('Cannot create a room with yourself');
  return a < b ? `${a}_${b}` : `${b}_${a}`;
};

export const parseRoomId = (roomId) => {
  const [a, b] = roomId.split('_');
  if (!a || !b) throw new Error('Malformed roomId');
  return [a, b];
};

export const roomContains = (roomId, userId) => {
  const [a, b] = parseRoomId(roomId);
  return a === userId || b === userId;
};

export const peerOf = (roomId, userId) => {
  const [a, b] = parseRoomId(roomId);
  if (a === userId) return b;
  if (b === userId) return a;
  throw new Error('User not part of room');
};
