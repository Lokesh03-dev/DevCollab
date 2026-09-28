import { Router } from 'express';
import { getProjectActivity } from '../controllers/activityController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/projects/:projectId/activity', authenticate, getProjectActivity);

export default router;