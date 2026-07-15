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
 * Loads friends + incoming/outgoing pending requests, keeps them in sync
 * whenever the server broadcasts a friendship event.
 */
export const useFriends = () => {
  const queryClient = useQueryClient();

  const friends = useQuery({
    queryKey: QUERY_KEYS.FRIENDS,
    queryFn: () => friendshipService.list(),
    staleTime: 60_000,
  });
  const incoming = useQuery({
    queryKey: QUERY_KEYS.FRIENDS_INCOMING,
    queryFn: () => friendshipService.incoming(),
    staleTime: 30_000,
  });
  const outgoing = useQuery({
    queryKey: QUERY_KEYS.FRIENDS_OUTGOING,
    queryFn: () => friendshipService.outgoing(),
    staleTime: 30_000,
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

const mutationWithInvalidate = (queryClient, extraKey) => (fn, onOk) => ({
  mutationFn: fn,
  onSuccess: (_data, variables) => {
    for (const key of INVALIDATE_KEYS) queryClient.invalidateQueries({ queryKey: key });
    if (variables) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(variables) });
    if (extraKey) queryClient.invalidateQueries({ queryKey: extraKey });
    onOk?.();
  },
  onError: (err) => toast.error(err?.response?.data?.error?.message ?? 'Something went wrong'),
});

/**
 * Optimistically insert a stub into the outgoing-requests cache so the
 * "Add friend" button flips to "Requested" instantly, without waiting for
 * the invalidated query to refetch. The subsequent refetch replaces this
 * stub with the authoritative row from the server.
 */
const optimisticallyAddOutgoing = (queryClient, userId) => {
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

const rollbackOutgoing = (queryClient, userId) => {
  queryClient.setQueryData(QUERY_KEYS.FRIENDS_OUTGOING, (prev) =>
    (prev ?? []).filter((r) => r.to?.id !== userId),
  );
};

export const useFriendshipMutations = () => {
  const queryClient = useQueryClient();
  const build = mutationWithInvalidate(queryClient, QUERY_KEYS.CONVERSATIONS);

  return {
    sendRequest: useMutation({
      mutationFn: (userId) => friendshipService.sendRequest(userId),
      onMutate: (userId) => {
        // Snapshot then optimistically add — restored in onError if the
        // server rejects (e.g. blocked or already-friends conflict).
        const snapshot = queryClient.getQueryData(QUERY_KEYS.FRIENDS_OUTGOING);
        optimisticallyAddOutgoing(queryClient, userId);
        return { snapshot };
      },
      onError: (err, userId, context) => {
        if (context?.snapshot !== undefined) {
          queryClient.setQueryData(QUERY_KEYS.FRIENDS_OUTGOING, context.snapshot);
        } else {
          rollbackOutgoing(queryClient, userId);
        }
        toast.error(err?.response?.data?.error?.message ?? 'Could not send friend request');
      },
      onSuccess: (_data, userId) => {
        toast.success('Friend request sent');
        for (const key of INVALIDATE_KEYS) queryClient.invalidateQueries({ queryKey: key });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATIONS });
      },
    }),
    accept: useMutation(build(
      (userId) => friendshipService.accept(userId),
      () => toast.success('Friend request accepted'),
    )),
    decline: useMutation(build((userId) => friendshipService.decline(userId))),
    cancel: useMutation(build((userId) => friendshipService.cancel(userId))),
    remove: useMutation(build(
      (userId) => friendshipService.remove(userId),
      () => toast('Friend removed'),
    )),
  };
};
