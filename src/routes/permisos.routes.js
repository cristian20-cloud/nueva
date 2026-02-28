// routes/permisos.routes.js
import express from 'express';
const router = express.Router();
import permisoController from '../controllers/permisos.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Permisos (Catálogo de permisos)
 * Base URL: /api/permisos
 * 
 * Este módulo gestiona el CATÁLOGO de permisos disponibles,
 * NO la asignación a roles (eso es detallePermisos)
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (accesibles con ver_roles)
// ============================================
// Verificar si un permiso específico existe
router.get('/verificar', checkPermission('ver_roles'), permisoController.verificarPermiso);

// Obtener permisos por rol (consulta los permisos del catálogo que tiene un rol)
router.get('/rol/:rolId', checkPermission('ver_roles'), permisoController.getPermisosByRol);

// Obtener permisos por módulo
router.get('/modulo/:modulo', checkPermission('ver_roles'), permisoController.getPermisosByModulo);

// ============================================
// RUTAS DE ADMINISTRACIÓN (SOLO ADMIN)
// ============================================
// Obtener todos los permisos del catálogo
router.get('/', checkPermission('ver_permisos'), permisoController.getAllPermisos);

// Obtener un permiso específico por ID
router.get('/:id', checkPermission('ver_permisos'), permisoController.getPermisoById);

// Inicializar permisos por defecto (solo admin)
router.post('/init', checkPermission('inicializar_permisos'), permisoController.initPermisos);

// Crear un nuevo permiso en el catálogo
router.post('/', checkPermission('crear_permisos'), permisoController.createPermiso);

// Actualizar un permiso existente
router.put('/:id', checkPermission('editar_permisos'), permisoController.updatePermiso);

// Eliminar un permiso del catálogo (¡CUIDADO! afecta a todos los roles)
router.delete('/:id', checkPermission('eliminar_permisos'), permisoController.deletePermiso);

// ============================================
// NOTA: Estos son permisos del CATÁLOGO,
// no confundir con detallePermisos (asignación)
// ============================================

export default router;