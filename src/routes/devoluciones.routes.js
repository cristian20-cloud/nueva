// routes/devoluciones.routes.js
import express from 'express';
const router = express.Router();
import devolucionController from '../controllers/devoluciones.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Devoluciones
 * Base URL: /api/devoluciones
 * 
 * Las devoluciones son operaciones CRÍTICAS que afectan:
 * - Inventario (stock)
 * - Contabilidad (reembolsos)
 * - Historial de ventas
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/estadisticas', checkPermission('ver_devoluciones'), devolucionController.getEstadisticas);
router.get('/reportes', checkPermission('ver_devoluciones'), devolucionController.generarReportes);

// ============================================
// RUTAS DE CONSULTA ESPECÍFICAS
// ============================================
router.get('/venta/:ventaId', checkPermission('ver_devoluciones'), devolucionController.getDevolucionesByVenta);
router.get('/producto/:productoId', checkPermission('ver_devoluciones'), devolucionController.getDevolucionesByProducto);
router.get('/fecha', checkPermission('ver_devoluciones'), devolucionController.getDevolucionesByFecha);
router.get('/cliente/:clienteId', checkPermission('ver_devoluciones'), devolucionController.getDevolucionesByCliente);

// ============================================
// CRUD PRINCIPAL
// ============================================
// GET - Consultas (requieren ver devoluciones)
router.get('/', checkPermission('ver_devoluciones'), devolucionController.getAllDevoluciones);
router.get('/:id', checkPermission('ver_devoluciones'), devolucionController.getDevolucionById);

// POST - Crear devolución (requiere permiso específico)
router.post('/', checkPermission('crear_devoluciones'), devolucionController.createDevolucion);

// PUT - Actualizar devolución (solo en casos excepcionales)
router.put('/:id', checkPermission('editar_devoluciones'), devolucionController.updateDevolucion);

// ============================================
// ACCIONES ESPECÍFICAS
// ============================================
// Cambiar estado de la devolución (aprobar/rechazar/procesar)
router.patch('/:id/estado', checkPermission('procesar_devoluciones'), devolucionController.toggleDevolucionStatus);

// Procesar reembolso
router.post('/:id/reembolso', checkPermission('procesar_devoluciones'), devolucionController.procesarReembolso);

// Anular devolución (NO eliminar)
router.post('/:id/anular', checkPermission('anular_devoluciones'), devolucionController.anularDevolucion);

// ============================================
// NOTA: DELETE explícitamente excluido
// Las devoluciones NUNCA se eliminan del sistema
// por razones de auditoría y trazabilidad
// ============================================
// router.delete('/:id', ...) ❌ NO IMPLEMENTAR

export default router;