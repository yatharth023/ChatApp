/**
 * Deterministic room id. Must match backend/src/utils/roomId.js exactly so
 * the same conversation resolves to the same room on both peers.
 */
export const buildRoomId = (a, b) => {
  if (!a || !b) throw new Error('buildRoomId requires two user ids');
  if (a === b) throw new Error('Cannot create a room with yourself');
  return a < b ? `${a}_${b}` : `${b}_${a}`;
};

export const peerOf = (roomId, userId) => {
  const [a, b] = roomId.split('_');
  if (a === userId) return b;
  if (b === userId) return a;
  throw new Error('User not part of room');
};
