// routes/tallas.routes.js
import express from 'express';
const router = express.Router();
import tallaController from '../controllers/tallas.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Tallas
 * Base URL: /api/tallas
 * 
 * Las tallas son datos maestros del sistema
 * (Ej: S, M, L, XL, 36, 38, 40, etc.)
 */

// ============================================
// RUTAS PÚBLICAS (solo consulta)
// ============================================
// Catálogo de tallas visible para todos
router.get('/', tallaController.getAll);
router.get('/activas', tallaController.getActivas);
router.get('/:id', tallaController.getById);
router.get('/categoria/:categoriaId', tallaController.getByCategoria);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
// Las siguientes rutas requieren token
router.use(verifyToken);

// ============================================
// RUTAS DE ADMINISTRACIÓN (gestionar tallas)
// ============================================
// Crear nueva talla
router.post('/', checkPermission('crear_tallas'), tallaController.create);

// Crear múltiples tallas (para categorías)
router.post('/multiples', checkPermission('crear_tallas'), tallaController.createMultiple);

// Actualizar talla existente
router.put('/:id', checkPermission('editar_tallas'), tallaController.update);

// Actualizar parcialmente
router.patch('/:id', checkPermission('editar_tallas'), tallaController.patch);

// Activar/desactivar talla
router.patch('/:id/estado', checkPermission('activar_tallas'), tallaController.toggleStatus);

// Eliminar talla
router.delete('/:id', checkPermission('eliminar_tallas'), tallaController.delete);

// Eliminar múltiples tallas
router.post('/eliminar-multiples', checkPermission('eliminar_tallas'), tallaController.deleteMultiple);

export default router;