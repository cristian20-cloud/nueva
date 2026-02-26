// routes/ventas.routes.js
import express from 'express';
const router = express.Router();
import ventaController from '../controllers/ventas.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Ventas
 * Base URL: /api/ventas
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas de consulta
router.get('/estados', ventaController.getEstadosVenta);
router.get('/estadisticas', ventaController.getEstadisticas);
router.get('/cliente/:clienteId', ventaController.getVentasByCliente);

// CRUD Principal
router.get('/', ventaController.getAllVentas);
router.get('/:id', ventaController.getVentaById);
router.post('/', checkRole(['ADMIN', 'SUPERVISOR', 'VENDEDOR']), ventaController.createVenta);

// Rutas específicas
router.post('/:id/anular', checkRole(['ADMIN', 'SUPERVISOR']), ventaController.anularVenta);

// NOTA: No hay rutas PUT/PATCH porque no se permite editar ventas
// Solo se pueden crear y anular

export default router;