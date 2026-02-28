// routes/auth.routes.js
import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateLogin, validateUsuario } from '../utils/validationUtils.js';

/**
 * Rutas de Autenticación
 * Base URL: /api/auth
 */

// 🟢 NUEVO: Ruta pública de registro para clientes
router.post('/registro', authController.registro);

// Rutas públicas existentes
router.post('/login', validate(validateLogin), authController.login);
router.post('/forgot-password', authController.forgotPassword);

// Rutas protegidas
router.get('/verify', verifyToken, authController.verify);
router.post('/change-password', verifyToken, authController.changePassword);

// 🟢 MODIFICADO: Ruta de registro para admin (protegida y con permiso)
router.post('/register', 
    verifyToken, 
    checkPermission('crear_usuarios'), 
    validate(validateUsuario), 
    authController.register
);

export default router;