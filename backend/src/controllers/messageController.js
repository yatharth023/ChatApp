import { asyncHandler } from '../utils/asyncHandler.js';
import { messageService } from '../services/messageService.js';

export const messageController = {
  history: asyncHandler(async (req, res) => {
    const result = await messageService.history(req.user.id, req.query);
    res.json(result);
  }),

  search: asyncHandler(async (req, res) => {
    const result = await messageService.search(req.user.id, req.query);
    res.json(result);
  }),

  conversations: asyncHandler(async (req, res) => {
    const conversations = await messageService.conversations(req.user.id);
    res.json({ conversations });
  }),
};
