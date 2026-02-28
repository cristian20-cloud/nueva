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
// Productos visibles al público (catálogo)
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
router.get('/:id', checkPermission('ver_productos'), productoController.getProductoById);
router.get('/categoria/:categoriaId', checkPermission('ver_productos'), productoController.getProductosByCategoria);
router.get('/talla/:tallaId', checkPermission('ver_productos'), productoController.getProductosByTalla);
router.get('/stock/bajo', checkPermission('ver_productos'), productoController.getProductosStockBajo);
router.get('/buscar', checkPermission('ver_productos'), productoController.buscarProductos);

// ============================================
// RUTAS DE ADMINISTRACIÓN (crear, editar, eliminar)
// ============================================
// Crear producto
router.post('/', checkPermission('crear_productos'), productoController.createProducto);

// Actualizar producto completo
router.put('/:id', checkPermission('editar_productos'), productoController.updateProducto);

// Actualizar parcialmente (PATCH)
router.patch('/:id', checkPermission('editar_productos'), productoController.patchProducto);

// Actualizar stock
router.patch('/:id/stock', checkPermission('editar_productos'), productoController.actualizarStock);

// Activar/desactivar producto
router.patch('/:id/estado', checkPermission('activar_productos'), productoController.toggleProductoStatus);

// Activar/desactivar oferta
router.patch('/:id/oferta', checkPermission('editar_productos'), productoController.toggleOferta);

// Eliminar producto
router.delete('/:id', checkPermission('eliminar_productos'), productoController.deleteProducto);

export default router;