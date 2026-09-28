import { Router } from 'express';
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProject,
  getProjects,
  removeProjectMember,
  updateProject,
} from '../controllers/projectController.js';
import { createProjectInvitation } from '../controllers/invitationController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.route('/').post(createProject).get(getProjects);
router.post('/:id/members', addProjectMember);
router.post('/:id/invitations', createProjectInvitation);
router.delete('/:id/members/:userId', removeProjectMember);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);

export default router;