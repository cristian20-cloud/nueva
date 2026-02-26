// routes/devoluciones.routes.js
import express from 'express';
const router = express.Router();
import devolucionController from '../controllers/devoluciones.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Devoluciones
 * Base URL: /api/devoluciones
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas de consulta
router.get('/estadisticas', devolucionController.getEstadisticas);
router.get('/venta/:ventaId', devolucionController.getDevolucionesByVenta);
router.get('/producto/:productoId', devolucionController.getDevolucionesByProducto);

// CRUD Completo (SIN DELETE)
router.get('/', devolucionController.getAllDevoluciones);
router.get('/:id', devolucionController.getDevolucionById);
router.post('/', checkRole(['ADMIN', 'SUPERVISOR']), devolucionController.createDevolucion);
router.put('/:id', checkRole(['ADMIN', 'SUPERVISOR']), devolucionController.updateDevolucion);
// router.delete('/:id', checkRole(['ADMIN']), devolucionController.deleteDevolucion); // ❌ ELIMINADO

// Rutas específicas
router.patch('/:id/estado', checkRole(['ADMIN', 'SUPERVISOR']), devolucionController.toggleDevolucionStatus);

export default router;