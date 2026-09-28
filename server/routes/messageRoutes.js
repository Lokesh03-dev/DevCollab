import { Router } from 'express';
import {
	getDirectConversations,
	getDirectMessages,
	getProjectMessages,
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/projects/:projectId/messages', authenticate, getProjectMessages);
router.get('/messages', authenticate, getDirectConversations);
router.get('/messages/:userId', authenticate, getDirectMessages);

export default router;