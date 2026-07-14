import { Router } from 'express';
import { uploadController } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.post('/signature', uploadController.signature);

export default router;
