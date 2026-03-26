// routes/auth.routes.js
import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/registro', authController.registro);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh); // ✅ AGREGAR ESTA LÍNEA
router.get('/verify', authenticateToken, authController.verify);
router.post('/register', authenticateToken, authController.register);
router.put('/change-password', authenticateToken, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);

export default router;