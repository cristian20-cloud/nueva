// routes/compras.routes.js
import express from 'express';
const router = express.Router();
import compraController from '../controllers/compras.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Compras
 * Base URL: /api/compras
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Estadísticas
router.get('/estadisticas', compraController.getEstadisticas);

// CRUD Principal
router.get('/', compraController.getAllCompras);
router.get('/:id', compraController.getCompraById);
router.post('/', checkRole(['ADMIN', 'SUPERVISOR', 'COMPRAS']), compraController.createCompra);

// Rutas específicas de compras
router.post('/:id/anular', checkRole(['ADMIN', 'SUPERVISOR']), compraController.anularCompra);
router.get('/proveedor/:proveedorId', compraController.getComprasByProveedor);
router.get('/:id/reporte', compraController.generarReporte);

// NOTA: No hay rutas PUT ni DELETE porque no se permite editar ni eliminar compras

export default router;