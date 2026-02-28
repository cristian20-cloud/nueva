// routes/estado.routes.js
import express from 'express';
const router = express.Router();
import estadoController from '../controllers/estado.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Estados (Catálogo)
 * Base URL: /api/estados
 * 
 * Los estados son datos maestros del sistema
 * (Ej: estado de pedido, estado de pago, etc.)
 */

// ============================================
// RUTAS PÚBLICAS (solo consulta)
// ============================================
// Cualquier persona puede ver los estados (catálogo público)
router.get('/', estadoController.getAll);
router.get('/:id', estadoController.getById);
router.get('/tipo/:tipo', estadoController.getByTipo);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación y permisos)
// ============================================
// Las siguientes rutas requieren token
router.use(verifyToken);

// Crear nuevo estado (solo admin o roles con permiso)
router.post('/', checkPermission('crear_estados'), estadoController.create);

// Actualizar estado existente
router.put('/:id', checkPermission('editar_estados'), estadoController.update);

// Eliminar estado (solo admin, con permiso especial)
router.delete('/:id', checkPermission('eliminar_estados'), estadoController.delete);

// Cambiar estado (activar/desactivar)
router.patch('/:id/estado', checkPermission('activar_estados'), estadoController.toggleStatus);

export default router;