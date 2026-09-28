import { Router } from 'express';
import { searchUsers } from '../controllers/messageController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', authenticate, searchUsers);

export default router;
