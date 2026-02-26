// routes/roles.routes.js
import express from 'express';
const router = express.Router();
import rolController from '../controllers/roles.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Roles
 * Base URL: /api/roles
 */

// Todas las rutas requieren autenticación y permisos de administrador
router.use(verifyToken);
router.use(checkRole(['Administrador']));

// Rutas de consulta
router.get('/activos', rolController.getRolesActivos);

// CRUD Principal
router.get('/', rolController.getAllRoles);
router.get('/:id', rolController.getRolById);
router.post('/', rolController.createRol);
router.put('/:id', rolController.updateRol);
router.delete('/:id', rolController.deleteRol);

// Rutas específicas
router.post('/:id/permisos', rolController.asignarPermisos);

export default router;