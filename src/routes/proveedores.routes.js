// routes/proveedores.routes.js
import express from 'express';
const router = express.Router();
import proveedorController from '../controllers/proveedores.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Proveedores
 * Base URL: /api/proveedores
 */

// Rutas públicas (si aplica)
router.get('/activos', verifyToken, proveedorController.getProveedoresActivos);
router.get('/estadisticas', verifyToken, proveedorController.getEstadisticas);
router.get('/nit/:nit', verifyToken, proveedorController.getProveedorByNIT);

// Rutas protegidas
router.use(verifyToken);

// CRUD Principal
router.get('/', proveedorController.getAllProveedores);
router.get('/:id', proveedorController.getProveedorById);
router.post('/', checkRole(['ADMIN', 'SUPERVISOR', 'COMPRAS']), proveedorController.createProveedor);
router.put('/:id', checkRole(['ADMIN', 'SUPERVISOR', 'COMPRAS']), proveedorController.updateProveedor);
router.delete('/:id', checkRole(['ADMIN']), proveedorController.deleteProveedor);

// Rutas específicas
router.patch('/:id/estado', checkRole(['ADMIN', 'SUPERVISOR']), proveedorController.toggleProveedorStatus);

export default router;