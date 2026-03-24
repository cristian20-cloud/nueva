import express from 'express';
const router = express.Router();
import devolucionController from '../controllers/devoluciones.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

router.use(verifyToken);

// 1. ESPECÍFICAS PRIMERO
router.get('/estadisticas', devolucionController.getEstadisticas);
router.get('/venta/:ventaId', devolucionController.getDevolucionesByVenta);
router.get('/producto/:productoId', devolucionController.getDevolucionesByProducto);

// 2. GENERALES DESPUÉS
router.get('/', devolucionController.getAllDevoluciones);
router.get('/:id', devolucionController.getDevolucionById);

router.post('/', checkRole(['ADMIN', 'SUPERVISOR']), devolucionController.createDevolucion);
router.put('/:id', checkRole(['ADMIN', 'SUPERVISOR']), devolucionController.updateDevolucion);
router.delete('/:id', checkRole(['ADMIN']), devolucionController.deleteDevolucion);
router.patch('/:id/estado', checkRole(['ADMIN', 'SUPERVISOR']), devolucionController.toggleDevolucionStatus);

export default router;