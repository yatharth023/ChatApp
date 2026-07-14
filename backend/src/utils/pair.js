/**
 * Canonical ordering of two user ids. Friendships are stored once per pair
 * with `userAId < userBId`, so any lookup/insert must go through this helper
 * to avoid duplicates and lookup misses.
 */
export const canonicalPair = (a, b) => {
  if (!a || !b) throw new Error('canonicalPair requires two ids');
  if (a === b) throw new Error('Cannot pair a user with themselves');
  return a < b ? [a, b] : [b, a];
};
