// routes/detalleCompras.routes.js
import express from 'express';
const router = express.Router();
import detalleCompraController from '../controllers/detalleCompras.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el Detalle de Compras
 * Base URL: /api/detallecompras
 * 
 * SOLO CONSULTAS - No hay creación/edición/eliminación
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas de consulta
router.get('/', checkPermission('ver_compras'), detalleCompraController.getAll);
router.get('/compra/:compraId', checkPermission('ver_compras'), detalleCompraController.getByCompra);
router.get('/compra/:compraId/resumen', checkPermission('ver_compras'), detalleCompraController.getResumenByCompra);
router.get('/:id', checkPermission('ver_compras'), detalleCompraController.getById);

export default router;