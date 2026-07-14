import { asyncHandler } from '../utils/asyncHandler.js';
import { blockService } from '../services/blockService.js';

export const blockController = {
  block: asyncHandler(async (req, res) => {
    await blockService.block(req.user.id, req.params.userId);
    res.status(204).end();
  }),

  unblock: asyncHandler(async (req, res) => {
    await blockService.unblock(req.user.id, req.params.userId);
    res.status(204).end();
  }),

  list: asyncHandler(async (req, res) => {
    const blocked = await blockService.list(req.user.id);
    res.json({ blocked });
  }),
};
