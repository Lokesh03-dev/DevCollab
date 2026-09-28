import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getCurrentUser, login, register } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
const authRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many authentication attempts. Try again later.',
	},
});

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.get('/me', authenticate, getCurrentUser);

export default router;