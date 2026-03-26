// routes/auth.routes.js
import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';  // ✅ verifyToken

const router = Router();

router.post('/registro', authController.registro);
router.post('/login', authController.login);
router.get('/verify', verifyToken, authController.verify);  // ✅ verifyToken
router.post('/register', verifyToken, authController.register);  // ✅ verifyToken
router.put('/change-password', verifyToken, authController.changePassword);  // ✅ verifyToken
router.post('/forgot-password', authController.forgotPassword);

export default router;