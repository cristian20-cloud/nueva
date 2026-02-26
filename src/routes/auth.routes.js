// routes/auth.routes.js
import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateLogin, validateUsuario } from '../utils/validationUtils.js';

/**
 * Rutas de Autenticación
 * Base URL: /api/auth
 */

// Rutas públicas
router.post('/login', validate(validateLogin), authController.login);
router.post('/forgot-password', authController.forgotPassword);

// Rutas protegidas
router.get('/verify', verifyToken, authController.verify);
router.post('/change-password', verifyToken, authController.changePassword);
router.post('/register', verifyToken, validate(validateUsuario), authController.register);

export default router;