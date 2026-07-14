import { asyncHandler } from '../utils/asyncHandler.js';
import { friendshipService } from '../services/friendshipService.js';
import { getIO } from '../socket/index.js';
import { emitToUser } from '../socket/utils/emit.js';

/**
 * REST controllers for the friend graph. Every mutation also emits a socket
 * event so the peer's sidebar refetches without polling.
 */
export const friendshipController = {
  sendRequest: asyncHandler(async (req, res) => {
    const { autoAccepted } = await friendshipService.sendRequest(req.user.id, req.params.userId);
    const io = getIO();
    if (autoAccepted) {
      // I received a pending request from `peerId` and immediately accepted:
      // notify the original requester so their outgoing turns into accepted.
      await emitToUser(io, req.params.userId, 'friend_request_accepted', {
        userId: req.user.id,
        at: new Date().toISOString(),
      });
    } else {
      await emitToUser(io, req.params.userId, 'friend_request_received', {
        userId: req.user.id,
        at: new Date().toISOString(),
      });
    }
    res.status(201).json({ status: autoAccepted ? 'accepted' : 'pending_outgoing' });
  }),

  accept: asyncHandler(async (req, res) => {
    await friendshipService.accept(req.user.id, req.params.userId);
    await emitToUser(getIO(), req.params.userId, 'friend_request_accepted', {
      userId: req.user.id,
      at: new Date().toISOString(),
    });
    res.json({ status: 'accepted' });
  }),

  decline: asyncHandler(async (req, res) => {
    await friendshipService.decline(req.user.id, req.params.userId);
    await emitToUser(getIO(), req.params.userId, 'friend_request_cancelled', {
      userId: req.user.id,
      at: new Date().toISOString(),
    });
    res.status(204).end();
  }),

  cancel: asyncHandler(async (req, res) => {
    await friendshipService.cancel(req.user.id, req.params.userId);
    await emitToUser(getIO(), req.params.userId, 'friend_request_cancelled', {
      userId: req.user.id,
      at: new Date().toISOString(),
    });
    res.status(204).end();
  }),

  remove: asyncHandler(async (req, res) => {
    await friendshipService.removeFriend(req.user.id, req.params.userId);
    await emitToUser(getIO(), req.params.userId, 'friend_removed', {
      userId: req.user.id,
      at: new Date().toISOString(),
    });
    res.status(204).end();
  }),

  list: asyncHandler(async (req, res) => {
    const friends = await friendshipService.listFriends(req.user.id);
    res.json({ friends });
  }),

  incoming: asyncHandler(async (req, res) => {
    const incoming = await friendshipService.listIncoming(req.user.id);
    res.json({ incoming });
  }),

  outgoing: asyncHandler(async (req, res) => {
    const outgoing = await friendshipService.listOutgoing(req.user.id);
    res.json({ outgoing });
  }),
};
