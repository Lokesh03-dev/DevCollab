import { Router } from 'express';
import {
  acceptInvitation,
  getMyInvitations,
  rejectInvitation,
} from '../controllers/invitationController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.get('/', getMyInvitations);
router.post('/:id/accept', acceptInvitation);
router.post('/:id/reject', rejectInvitation);

export default router;
