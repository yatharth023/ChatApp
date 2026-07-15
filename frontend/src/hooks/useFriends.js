import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { friendshipService } from '../services/friendshipService.js';
import { QUERY_KEYS, SOCKET_EVENTS } from '../utils/constants.js';
import { useSocketEvent } from './useSocketEvent.js';

const INVALIDATE_KEYS = [
  QUERY_KEYS.FRIENDS,
  QUERY_KEYS.FRIENDS_INCOMING,
  QUERY_KEYS.FRIENDS_OUTGOING,
];

/**
 * Refetch friend state periodically as a fallback for socket delivery
 * failures. In prod, Upstash / the socket adapter can miss the occasional
 * event; polling every few seconds means the worst case is a short delay
 * rather than "the user has to refresh the page".
 */
const FRIEND_POLL_MS = 4000;

/**
 * Loads friends + incoming/outgoing pending requests, keeps them in sync
 * both via realtime socket events AND a background poll so realtime
 * hiccups can't leave the sidebar out of date.
 */
export const useFriends = () => {
  const queryClient = useQueryClient();

  const friends = useQuery({
    queryKey: QUERY_KEYS.FRIENDS,
    queryFn: () => friendshipService.list(),
    staleTime: 2_000,
    refetchInterval: FRIEND_POLL_MS,
    refetchOnWindowFocus: true,
  });
  const incoming = useQuery({
    queryKey: QUERY_KEYS.FRIENDS_INCOMING,
    queryFn: () => friendshipService.incoming(),
    staleTime: 2_000,
    refetchInterval: FRIEND_POLL_MS,
    refetchOnWindowFocus: true,
  });
  const outgoing = useQuery({
    queryKey: QUERY_KEYS.FRIENDS_OUTGOING,
    queryFn: () => friendshipService.outgoing(),
    staleTime: 2_000,
    refetchInterval: FRIEND_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const invalidateAll = () => {
    for (const key of INVALIDATE_KEYS) queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATIONS });
  };

  useSocketEvent(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, ({ userId }) => {
    toast('You have a new friend request', { icon: '👋' });
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userId) });
  });
  useSocketEvent(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, ({ userId }) => {
    toast.success('Friend request accepted');
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userId) });
  });
  useSocketEvent(SOCKET_EVENTS.FRIEND_REQUEST_CANCELLED, ({ userId }) => {
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userId) });
  });
  useSocketEvent(SOCKET_EVENTS.FRIEND_REMOVED, ({ userId }) => {
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userId) });
  });

  return {
    friends: friends.data ?? [],
    incoming: incoming.data ?? [],
    outgoing: outgoing.data ?? [],
    isLoading: friends.isLoading || incoming.isLoading || outgoing.isLoading,
    refetch: invalidateAll,
  };
};

// ---------------------------------------------------------------------------
// Optimistic mutation helpers
// ---------------------------------------------------------------------------
// Every friend action fires the server call AND immediately mutates the
// local caches so the UI reflects the change on the next paint. If the
// server rejects, we roll back to a snapshot taken in `onMutate`. This
// keeps the UI snappy under flaky sockets / cold-starting Render backends.

const addOutgoingStub = (queryClient, userId) => {
  queryClient.setQueryData(QUERY_KEYS.FRIENDS_OUTGOING, (prev) => {
    const list = prev ?? [];
    if (list.some((r) => r.to?.id === userId)) return list;
    return [
      ...list,
      {
        friendshipId: `optimistic-${userId}`,
        requestedAt: new Date().toISOString(),
        to: { id: userId },
      },
    ];
  });
};

const removeFromIncoming = (queryClient, userId) =>
  queryClient.setQueryData(QUERY_KEYS.FRIENDS_INCOMING, (prev) =>
    (prev ?? []).filter((r) => r.from?.id !== userId),
  );

const removeFromOutgoing = (queryClient, userId) =>
  queryClient.setQueryData(QUERY_KEYS.FRIENDS_OUTGOING, (prev) =>
    (prev ?? []).filter((r) => r.to?.id !== userId),
  );

const removeFromFriends = (queryClient, userId) =>
  queryClient.setQueryData(QUERY_KEYS.FRIENDS, (prev) =>
    (prev ?? []).filter((f) => f.user?.id !== userId),
  );

/**
 * Move a user from incoming (or a cached profile) into the friends list
 * so accepting a request shows the friend on the next render, without
 * waiting for the friend list to refetch.
 */
const promoteToFriend = (queryClient, userId) => {
  const incoming = queryClient.getQueryData(QUERY_KEYS.FRIENDS_INCOMING) ?? [];
  const outgoing = queryClient.getQueryData(QUERY_KEYS.FRIENDS_OUTGOING) ?? [];
  const cachedProfile = queryClient.getQueryData(QUERY_KEYS.PROFILE(userId));
  const user =
    incoming.find((r) => r.from?.id === userId)?.from ??
    outgoing.find((r) => r.to?.id === userId)?.to ??
    cachedProfile ??
    { id: userId };

  queryClient.setQueryData(QUERY_KEYS.FRIENDS, (prev) => {
    const list = prev ?? [];
    if (list.some((f) => f.user?.id === userId)) return list;
    return [
      { friendshipId: `optimistic-${userId}`, since: new Date().toISOString(), user },
      ...list,
    ];
  });
};

const snapshotFriendCaches = (queryClient) => ({
  friends: queryClient.getQueryData(QUERY_KEYS.FRIENDS),
  incoming: queryClient.getQueryData(QUERY_KEYS.FRIENDS_INCOMING),
  outgoing: queryClient.getQueryData(QUERY_KEYS.FRIENDS_OUTGOING),
});

const restoreFriendCaches = (queryClient, snap) => {
  if (!snap) return;
  queryClient.setQueryData(QUERY_KEYS.FRIENDS, snap.friends);
  queryClient.setQueryData(QUERY_KEYS.FRIENDS_INCOMING, snap.incoming);
  queryClient.setQueryData(QUERY_KEYS.FRIENDS_OUTGOING, snap.outgoing);
};

const invalidateAllFriend = (queryClient, userId) => {
  for (const key of INVALIDATE_KEYS) queryClient.invalidateQueries({ queryKey: key });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userId) });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATIONS });
};

export const useFriendshipMutations = () => {
  const queryClient = useQueryClient();

  const sendRequest = useMutation({
    mutationFn: (userId) => friendshipService.sendRequest(userId),
    onMutate: (userId) => {
      const snap = snapshotFriendCaches(queryClient);
      addOutgoingStub(queryClient, userId);
      return snap;
    },
    onError: (err, _userId, snap) => {
      restoreFriendCaches(queryClient, snap);
      toast.error(err?.response?.data?.error?.message ?? 'Could not send friend request');
    },
    onSuccess: (_data, userId) => {
      toast.success('Friend request sent');
      invalidateAllFriend(queryClient, userId);
    },
  });

  const accept = useMutation({
    mutationFn: (userId) => friendshipService.accept(userId),
    onMutate: (userId) => {
      const snap = snapshotFriendCaches(queryClient);
      promoteToFriend(queryClient, userId);
      removeFromIncoming(queryClient, userId);
      return snap;
    },
    onError: (err, _userId, snap) => {
      restoreFriendCaches(queryClient, snap);
      toast.error(err?.response?.data?.error?.message ?? 'Could not accept request');
    },
    onSuccess: (_data, userId) => {
      toast.success('Friend request accepted');
      invalidateAllFriend(queryClient, userId);
    },
  });

  const decline = useMutation({
    mutationFn: (userId) => friendshipService.decline(userId),
    onMutate: (userId) => {
      const snap = snapshotFriendCaches(queryClient);
      removeFromIncoming(queryClient, userId);
      return snap;
    },
    onError: (err, _userId, snap) => {
      restoreFriendCaches(queryClient, snap);
      toast.error(err?.response?.data?.error?.message ?? 'Could not decline');
    },
    onSuccess: (_data, userId) => invalidateAllFriend(queryClient, userId),
  });

  const cancel = useMutation({
    mutationFn: (userId) => friendshipService.cancel(userId),
    onMutate: (userId) => {
      const snap = snapshotFriendCaches(queryClient);
      removeFromOutgoing(queryClient, userId);
      return snap;
    },
    onError: (err, _userId, snap) => {
      restoreFriendCaches(queryClient, snap);
      toast.error(err?.response?.data?.error?.message ?? 'Could not cancel');
    },
    onSuccess: (_data, userId) => invalidateAllFriend(queryClient, userId),
  });

  const remove = useMutation({
    mutationFn: (userId) => friendshipService.remove(userId),
    onMutate: (userId) => {
      const snap = snapshotFriendCaches(queryClient);
      removeFromFriends(queryClient, userId);
      return snap;
    },
    onError: (err, _userId, snap) => {
      restoreFriendCaches(queryClient, snap);
      toast.error(err?.response?.data?.error?.message ?? 'Could not remove friend');
    },
    onSuccess: (_data, userId) => {
      toast('Friend removed');
      invalidateAllFriend(queryClient, userId);
    },
  });

  return { sendRequest, accept, decline, cancel, remove };
};
