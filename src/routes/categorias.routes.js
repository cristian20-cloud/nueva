// routes/categorias.routes.js
import express from 'express';
const router = express.Router();
import categoriaController from '../controllers/categorias.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Categorías
 * Basado en PERMISOS, no en roles hardcodeados
 */

// Rutas públicas (si aplica)
router.get('/activas', categoriaController.getCategoriasActivas);

// Rutas protegidas (requieren autenticación)
router.use(verifyToken);

// CRUD Principal basado en PERMISOS
router.get('/', checkPermission('ver_categorias'), categoriaController.getAllCategorias);
router.get('/:id', checkPermission('ver_categorias'), categoriaController.getCategoriaById);
router.post('/', checkPermission('crear_categorias'), categoriaController.createCategoria);
router.put('/:id', checkPermission('editar_categorias'), categoriaController.updateCategoria);
router.delete('/:id', checkPermission('eliminar_categorias'), categoriaController.deleteCategoria);
router.patch('/:id/estado', checkPermission('activar_categorias'), categoriaController.toggleCategoriaStatus);

export default router;