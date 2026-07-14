import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import messageRoutes from './messageRoutes.js';
import blockRoutes from './blockRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import friendshipRoutes from './friendshipRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/block', blockRoutes);
router.use('/upload', uploadRoutes);
router.use('/friends', friendshipRoutes);

export default router;
