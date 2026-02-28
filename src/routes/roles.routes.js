// routes/roles.routes.js
import express from 'express';
const router = express.Router();
import rolController from '../controllers/roles.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Roles
 * Base URL: /api/roles
 * 
 * Los roles son fundamentales para la seguridad del sistema.
 * Solo usuarios con permisos específicos pueden gestionarlos.
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver roles)
// ============================================
// Ver roles activos (para selects, combos, etc.)
router.get('/activos', checkPermission('ver_roles'), rolController.getRolesActivos);

// Obtener todos los roles
router.get('/', checkPermission('ver_roles'), rolController.getAllRoles);

// Obtener un rol por ID
router.get('/:id', checkPermission('ver_roles'), rolController.getRolById);

// Obtener permisos de un rol específico
router.get('/:id/permisos', checkPermission('ver_roles'), rolController.getPermisosByRol);

// ============================================
// RUTAS DE ADMINISTRACIÓN (gestionar roles)
// ============================================
// Crear un nuevo rol
router.post('/', checkPermission('crear_roles'), rolController.createRol);

// Actualizar un rol existente
router.put('/:id', checkPermission('editar_roles'), rolController.updateRol);

// Actualizar parcialmente un rol
router.patch('/:id', checkPermission('editar_roles'), rolController.patchRol);

// Activar/desactivar un rol
router.patch('/:id/estado', checkPermission('activar_roles'), rolController.toggleRolStatus);

// ============================================
// RUTAS DE ASIGNACIÓN DE PERMISOS
// ============================================
// Asignar permisos a un rol (reemplaza todos)
router.post('/:id/permisos', checkPermission('asignar_permisos'), rolController.asignarPermisos);

// Agregar un permiso específico a un rol
router.post('/:id/permisos/agregar', checkPermission('asignar_permisos'), rolController.agregarPermiso);

// Quitar un permiso específico de un rol
router.delete('/:id/permisos/:permisoId', checkPermission('asignar_permisos'), rolController.quitarPermiso);

// ============================================
// ELIMINACIÓN DE ROLES (solo admin con permiso especial)
// ============================================
// Eliminar un rol (¡CUIDADO! afecta a usuarios con ese rol)
router.delete('/:id', checkPermission('eliminar_roles'), rolController.deleteRol);

export default router;