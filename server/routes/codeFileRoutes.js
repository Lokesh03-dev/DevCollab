import { Router } from 'express';
import {
  createCodeFile,
  deleteCodeFile,
  getCodeFile,
  getProjectCodeFiles,
  updateCodeFile,
} from '../controllers/codeFileController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.route('/projects/:projectId/code-files')
  .post(authenticate, createCodeFile)
  .get(authenticate, getProjectCodeFiles);
router.route('/code-files/:fileId')
  .get(authenticate, getCodeFile)
  .put(authenticate, updateCodeFile)
  .delete(authenticate, deleteCodeFile);

export default router;