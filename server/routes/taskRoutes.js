import { Router } from 'express';
import {
  createTask,
  deleteTask,
  getProjectTasks,
  updateTask,
} from '../controllers/taskController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.route('/projects/:projectId/tasks')
  .post(authenticate, createTask)
  .get(authenticate, getProjectTasks);
router.route('/tasks/:taskId')
  .put(authenticate, updateTask)
  .delete(authenticate, deleteTask);

export default router;