// routes/productos.routes.js
import express from 'express';
const router = express.Router();
import productoController from '../controllers/productos.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Productos
 * Base URL: /api/productos
 */

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================
router.get('/publicos', productoController.getProductosPublicos);
router.get('/destacados', productoController.getProductosDestacados);
router.get('/categoria/:categoriaId/publico', productoController.getProductosByCategoriaPublico);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver productos)
// ============================================
router.get('/', checkPermission('ver_productos'), productoController.getAllProductos);
router.get('/categoria/:categoriaId', checkPermission('ver_productos'), productoController.getProductosByCategoria);
router.get('/talla/:tallaId', checkPermission('ver_productos'), productoController.getProductosByTalla);
router.get('/stock-bajo', checkPermission('ver_productos'), productoController.getProductosStockBajo);
router.get('/buscar', checkPermission('ver_productos'), productoController.buscarProductos);
router.get('/:id', checkPermission('ver_productos'), productoController.getProductoById);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
router.post('/', checkPermission('crear_productos'), productoController.createProducto);
router.put('/:id', checkPermission('editar_productos'), productoController.updateProducto);
router.patch('/:id', checkPermission('editar_productos'), productoController.patchProducto);
router.patch('/:id/stock', checkPermission('editar_productos'), productoController.actualizarStock);
router.patch('/:id/estado', checkPermission('activar_productos'), productoController.toggleProductoStatus);
router.patch('/:id/oferta', checkPermission('editar_productos'), productoController.toggleOferta);
router.delete('/:id', checkPermission('eliminar_productos'), productoController.deleteProducto);

export default router;