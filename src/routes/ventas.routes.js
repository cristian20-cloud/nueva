// routes/ventas.routes.js
import express from 'express';
const router = express.Router();
import ventaController from '../controllers/ventas.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Ventas
 * Base URL: /api/ventas
 * 
 * Las ventas son operaciones CRÍTICAS que afectan:
 * - Inventario (stock)
 * - Contabilidad (ingresos)
 * - Historial de clientes
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver ventas)
// ============================================
router.get('/', checkPermission('ver_ventas'), ventaController.getAllVentas);
router.get('/estados', checkPermission('ver_ventas'), ventaController.getEstadosVenta);
router.get('/estadisticas', checkPermission('ver_ventas'), ventaController.getEstadisticas);
router.get('/cliente/:clienteId', checkPermission('ver_ventas'), ventaController.getVentasByCliente);
router.get('/fecha', checkPermission('ver_ventas'), ventaController.getVentasByFecha);
router.get('/rango-fechas', checkPermission('ver_ventas'), ventaController.getVentasByRangoFechas);
router.get('/producto/:productoId', checkPermission('ver_ventas'), ventaController.getVentasByProducto);
router.get('/vendedor/:vendedorId', checkPermission('ver_ventas'), ventaController.getVentasByVendedor);
router.get('/:id', checkPermission('ver_ventas'), ventaController.getVentaById);
router.get('/:id/detalle', checkPermission('ver_ventas'), ventaController.getVentaConDetalle);
router.get('/:id/reporte', checkPermission('ver_ventas'), ventaController.generarReporteIndividual);

// ============================================
// RUTAS DE CREACIÓN (hacer ventas)
// ============================================
// Crear venta (vendedores, cajeros, etc.)
router.post('/', checkPermission('crear_ventas'), ventaController.createVenta);

// Crear venta con múltiples productos
router.post('/completa', checkPermission('crear_ventas'), ventaController.createVentaCompleta);

// ============================================
// RUTAS DE ADMINISTRACIÓN (gestionar ventas)
// ============================================
// Anular venta (NO eliminar)
router.post('/:id/anular', checkPermission('anular_ventas'), ventaController.anularVenta);

// Procesar pago
router.post('/:id/procesar-pago', checkPermission('editar_ventas'), ventaController.procesarPago);

// Actualizar estado de la venta (ej: pagado, enviado, entregado)
router.patch('/:id/estado', checkPermission('editar_ventas'), ventaController.actualizarEstado);

// ============================================
// NOTAS IMPORTANTES:
// ============================================
// ❌ NO hay PUT /:id - Las ventas no se editan directamente
// ❌ NO hay DELETE /:id - Las ventas no se eliminan por integridad contable
// ✅ Solo se pueden CREAR, ANULAR o actualizar su ESTADO
// ============================================

export default router;