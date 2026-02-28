// routes/imagenes.routes.js
import express from 'express';
const router = express.Router();
import imagenController from '../controllers/imagenes.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Imágenes
 * Base URL: /api/imagenes
 * 
 * Las imágenes están asociadas a productos y otros elementos
 */

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================
// Las imágenes pueden ser vistas por cualquier persona (público)
router.get('/producto/:productoId', imagenController.getByProducto);
router.get('/:id', imagenController.getById);
router.get('/producto/:productoId/principal', imagenController.getPrincipalByProducto);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA AVANZADA
// ============================================
router.get('/admin/todas', checkPermission('ver_productos'), imagenController.getAll);
router.get('/estadisticas', checkPermission('ver_productos'), imagenController.getEstadisticas);

// ============================================
// RUTAS DE ADMINISTRACIÓN DE IMÁGENES
// ============================================
// Subir una imagen (requiere permiso de editar productos)
router.post('/', checkPermission('editar_productos'), imagenController.create);

// Subir múltiples imágenes
router.post('/multiples', checkPermission('editar_productos'), imagenController.createMultiple);

// Actualizar información de imagen
router.put('/:id', checkPermission('editar_productos'), imagenController.update);

// Establecer imagen como principal
router.patch('/:id/principal', checkPermission('editar_productos'), imagenController.setPrincipal);

// Eliminar imagen (solo admin o permisos específicos)
router.delete('/:id', checkPermission('eliminar_productos'), imagenController.delete);

// Eliminar múltiples imágenes
router.post('/eliminar-multiples', checkPermission('eliminar_productos'), imagenController.deleteMultiple);

export default router;