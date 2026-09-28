import { Router } from 'express';
import {
  createComment,
  deleteComment,
  getTaskComments,
  updateComment,
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.route('/tasks/:taskId/comments')
  .post(authenticate, createComment)
  .get(authenticate, getTaskComments);
router.route('/comments/:commentId')
  .put(authenticate, updateComment)
  .delete(authenticate, deleteComment);

export default router;