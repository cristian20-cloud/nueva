// routes/compras.routes.js
import express from 'express';
const router = express.Router();
import compraController from '../controllers/compras.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Compras
 * Base URL: /api/compras
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/estadisticas', checkPermission('ver_compras'), compraController.getEstadisticas);
router.get('/reportes/general', checkPermission('ver_compras'), compraController.generarReporteGeneral);
router.get('/:id/reporte', checkPermission('ver_compras'), compraController.generarReporteIndividual);

// ============================================
// RUTAS ESPECÍFICAS
// ============================================
router.get('/proveedor/:proveedorId', checkPermission('ver_compras'), compraController.getComprasByProveedor);
router.get('/fecha', checkPermission('ver_compras'), compraController.getComprasByFecha);
router.get('/rango-fechas', checkPermission('ver_compras'), compraController.getComprasByRangoFechas);

// ============================================
// CRUD PRINCIPAL
// ============================================
// GET - Ver compras (permiso de ver)
router.get('/', checkPermission('ver_compras'), compraController.getAllCompras);
router.get('/:id', checkPermission('ver_compras'), compraController.getCompraById);

// POST - Crear compra (permiso de crear)
router.post('/', checkPermission('crear_compras'), compraController.createCompra);

// ============================================
// ACCIONES ESPECIALES
// ============================================
// Anular compra (permiso específico - NO es eliminar)
router.post('/:id/anular', checkPermission('anular_compras'), compraController.anularCompra);

// NOTA: No hay rutas PUT (editar) ni DELETE (eliminar) porque:
// - Las compras no se editan una vez creadas (solo se anulan)
// - Las compras no se eliminan por integridad contable/fiscal

export default router;