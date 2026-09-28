import { Router } from 'express';
import { connectProjectGitHub, getProjectGitHub } from '../controllers/githubController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.route('/:id/github')
  .get(authenticate, getProjectGitHub)
  .put(authenticate, connectProjectGitHub);

export default router;