import { Router } from 'express';
import { messageController } from '../controllers/messageController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { historyQuerySchema, searchQuerySchema } from '../validators/messageValidator.js';

const router = Router();

router.use(authenticate);

router.get('/conversations', messageController.conversations);
router.get('/history', validate(historyQuerySchema, 'query'), messageController.history);
router.get('/search', validate(searchQuerySchema, 'query'), messageController.search);

export default router;
