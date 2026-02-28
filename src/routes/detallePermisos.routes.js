// routes/detallePermisos.routes.js
import express from 'express';
const router = express.Router();
import detallePermisoController from '../controllers/detallePermisos.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el Detalle de Permisos (Asignación de permisos a roles)
 * Base URL: /api/detallepermisos
 * 
 * Este módulo es CRÍTICO para la seguridad del sistema.
 * Solo usuarios con permisos específicos pueden modificar asignaciones.
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA
// ============================================
// Ver permisos de un rol específico (requiere ver roles o permisos)
router.get('/rol/:rolId', checkPermission('ver_roles'), detallePermisoController.getByRol);

// Verificar si un rol tiene un permiso específico
router.get('/verificar', checkPermission('ver_roles'), detallePermisoController.verificar);

// Obtener todos los permisos asignados (con filtros)
router.get('/', checkPermission('ver_roles'), detallePermisoController.getAll);

// ============================================
// RUTAS DE ADMINISTRACIÓN (SOLO ADMIN)
// ============================================
// Asignar permiso a un rol (acción crítica - solo admin)
router.post('/asignar', checkPermission('asignar_permisos'), detallePermisoController.asignar);

// Asignar múltiples permisos a un rol
router.post('/asignar-multiple', checkPermission('asignar_permisos'), detallePermisoController.asignarMultiple);

// Quitar permiso de un rol (acción crítica - solo admin)
router.delete('/:id', checkPermission('asignar_permisos'), detallePermisoController.remove);

// Quitar múltiples permisos de un rol
router.post('/quitar-multiple', checkPermission('asignar_permisos'), detallePermisoController.quitarMultiple);

// Sincronizar permisos (reemplazar todos los permisos de un rol)
router.put('/rol/:rolId/sincronizar', checkPermission('asignar_permisos'), detallePermisoController.sincronizar);

export default router;