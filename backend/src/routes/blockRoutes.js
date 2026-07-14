import { Router } from 'express';
import { blockController } from '../controllers/blockController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { userIdParamSchema } from '../validators/userValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', blockController.list);
router.post('/:userId', validate(userIdParamSchema, 'params'), blockController.block);
router.delete('/:userId', validate(userIdParamSchema, 'params'), blockController.unblock);

export default router;
