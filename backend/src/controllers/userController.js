import { asyncHandler } from '../utils/asyncHandler.js';
import { userService } from '../services/userService.js';

export const userController = {
  search: asyncHandler(async (req, res) => {
    const { items, nextCursor } = await userService.search(req.user.id, req.query);
    res.json({ users: items, nextCursor });
  }),

  publicProfile: asyncHandler(async (req, res) => {
    const user = await userService.publicProfile(req.user.id, req.params.userId);
    res.json({ user });
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json({ user });
  }),

  changePassword: asyncHandler(async (req, res) => {
    await userService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    res.status(204).end();
  }),

  deleteMe: asyncHandler(async (req, res) => {
    await userService.deleteAccount(req.user.id);
    res.status(204).end();
  }),
};
