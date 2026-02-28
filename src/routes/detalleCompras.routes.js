// routes/detalleCompras.routes.js
import express from 'express';
const router = express.Router();
import detalleCompraController from '../controllers/detalleCompras.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el Detalle de Compras
 * Base URL: /api/detallecompras
 * 
 * Los detalles de compra heredan los permisos del módulo de Compras
 * ya que son parte integral de una compra
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS PRINCIPALES
// ============================================
// Listar todos los detalles (requiere ver compras)
router.get('/', checkPermission('ver_compras'), detalleCompraController.getAll);

// Obtener detalles por ID de compra
router.get('/compra/:compraId', checkPermission('ver_compras'), detalleCompraController.getByCompra);

// Obtener un detalle específico por su ID
router.get('/:id', checkPermission('ver_compras'), detalleCompraController.getById);

// ============================================
// NOTA: No hay rutas de creación, edición o eliminación
// porque los detalles se manejan automáticamente
// al crear/modificar una compra
// ============================================
// - POST: Se crean automáticamente al crear una compra (en compras.routes.js)
// - PUT: No se editan directamente (se maneja anulando la compra)
// - DELETE: No se eliminan individualmente por integridad referencial

export default router;