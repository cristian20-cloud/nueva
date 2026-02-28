// routes/detalleVentas.routes.js
import express from 'express';
const router = express.Router();
import detalleVentaController from '../controllers/detalleVentas.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el Detalle de Ventas
 * Base URL: /api/detalleventas
 * 
 * Los detalles de venta heredan los permisos del módulo de Ventas
 * ya que son parte integral de una venta
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA
// ============================================
// Obtener detalles por ID de venta
router.get('/venta/:ventaId', checkPermission('ver_ventas'), detalleVentaController.getByVenta);

// Obtener todos los detalles (con filtros)
router.get('/', checkPermission('ver_ventas'), detalleVentaController.getAll);

// Obtener un detalle específico por su ID
router.get('/:id', checkPermission('ver_ventas'), detalleVentaController.getById);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
// NOTA IMPORTANTE: En la mayoría de los sistemas, los detalles de venta
// NO se crean/modifican/eliminan individualmente, sino que se manejan
// desde la venta principal. Pero si tu negocio lo requiere:

// Crear un detalle de venta individual
router.post('/', checkPermission('crear_ventas'), detalleVentaController.create);

// Actualizar un detalle de venta
router.put('/:id', checkPermission('editar_ventas'), detalleVentaController.update);

// Eliminar un detalle de venta (solo admin o permisos especiales)
router.delete('/:id', checkPermission('eliminar_ventas'), detalleVentaController.delete);

// ============================================
// RUTAS PARA DEVOLUCIONES
// ============================================
// Marcar detalle como devuelto (parcial)
router.patch('/:id/devolver', checkPermission('anular_ventas'), detalleVentaController.marcarDevuelto);

export default router;