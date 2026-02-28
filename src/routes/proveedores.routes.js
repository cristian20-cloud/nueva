// routes/proveedores.routes.js
import express from 'express';
const router = express.Router();
import proveedorController from '../controllers/proveedores.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Proveedores
 * Base URL: /api/proveedores
 */

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================
// Información básica de proveedores (público)
router.get('/publicos', proveedorController.getProveedoresPublicos);
router.get('/:id/publico', proveedorController.getProveedorPublicoById);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver proveedores)
// ============================================
router.get('/', checkPermission('ver_proveedores'), proveedorController.getAllProveedores);
router.get('/activos', checkPermission('ver_proveedores'), proveedorController.getProveedoresActivos);
router.get('/estadisticas', checkPermission('ver_proveedores'), proveedorController.getEstadisticas);
router.get('/nit/:nit', checkPermission('ver_proveedores'), proveedorController.getProveedorByNIT);
router.get('/:id', checkPermission('ver_proveedores'), proveedorController.getProveedorById);
router.get('/:id/compras', checkPermission('ver_proveedores'), proveedorController.getComprasByProveedor);
router.get('/buscar', checkPermission('ver_proveedores'), proveedorController.buscarProveedores);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
// Crear proveedor
router.post('/', checkPermission('crear_proveedores'), proveedorController.createProveedor);

// Actualizar proveedor
router.put('/:id', checkPermission('editar_proveedores'), proveedorController.updateProveedor);

// Actualizar parcialmente
router.patch('/:id', checkPermission('editar_proveedores'), proveedorController.patchProveedor);

// Activar/desactivar proveedor
router.patch('/:id/estado', checkPermission('activar_proveedores'), proveedorController.toggleProveedorStatus);

// Eliminar proveedor
router.delete('/:id', checkPermission('eliminar_proveedores'), proveedorController.deleteProveedor);

export default router;