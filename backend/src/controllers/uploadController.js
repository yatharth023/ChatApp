import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadService } from '../services/uploadService.js';

export const uploadController = {
  signature: asyncHandler(async (req, res) => {
    const payload = uploadService.signMediaUpload(req.user.id);
    res.json(payload);
  }),
};
