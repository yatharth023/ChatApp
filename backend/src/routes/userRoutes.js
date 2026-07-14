import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  searchUsersSchema,
  updateProfileSchema,
  userIdParamSchema,
} from '../validators/userValidator.js';
import { changePasswordSchema } from '../validators/authValidator.js';

const router = Router();

router.use(authenticate);

router.get('/search', validate(searchUsersSchema, 'query'), userController.search);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);
router.patch('/me/password', validate(changePasswordSchema), userController.changePassword);
router.delete('/me', userController.deleteMe);
router.get('/:userId', validate(userIdParamSchema, 'params'), userController.publicProfile);

export default router;
