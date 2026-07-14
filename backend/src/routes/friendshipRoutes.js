import { Router } from 'express';
import { friendshipController } from '../controllers/friendshipController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { userIdParamSchema } from '../validators/userValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', friendshipController.list);
router.get('/requests/incoming', friendshipController.incoming);
router.get('/requests/outgoing', friendshipController.outgoing);

router.post('/request/:userId', validate(userIdParamSchema, 'params'), friendshipController.sendRequest);
router.post('/accept/:userId', validate(userIdParamSchema, 'params'), friendshipController.accept);
router.post('/decline/:userId', validate(userIdParamSchema, 'params'), friendshipController.decline);
router.post('/cancel/:userId', validate(userIdParamSchema, 'params'), friendshipController.cancel);
router.delete('/:userId', validate(userIdParamSchema, 'params'), friendshipController.remove);

export default router;
