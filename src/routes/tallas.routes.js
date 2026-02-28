// routes/tallas.routes.js
import express from 'express';
const router = express.Router();
import tallaController from '../controllers/tallas.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Tallas
 * Base URL: /api/tallas
 */

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================
router.get('/', tallaController.getAll);
router.get('/activas', tallaController.getActivas);
router.get('/categoria/:categoriaId', tallaController.getByCategoria);
router.get('/:id', tallaController.getById);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
router.post('/', checkPermission('crear_tallas'), tallaController.create);
router.post('/multiples', checkPermission('crear_tallas'), tallaController.createMultiple);
router.put('/:id', checkPermission('editar_tallas'), tallaController.update);
router.patch('/:id', checkPermission('editar_tallas'), tallaController.patch);
router.patch('/:id/estado', checkPermission('activar_tallas'), tallaController.toggleStatus);
router.post('/eliminar-multiples', checkPermission('eliminar_tallas'), tallaController.deleteMultiple);
router.delete('/:id', checkPermission('eliminar_tallas'), tallaController.delete);

export default router;