// routes/detallePermisos.routes.js
import express from 'express';
const router = express.Router();
import detallePermisoController from '../controllers/detallePermisos.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

// Todas las rutas requieren autenticación y rol de Administrador
router.use(verifyToken);
router.use(checkRole(['Administrador']));

// Rutas
router.get('/rol/:rolId', detallePermisoController.getByRol);
router.get('/verificar', detallePermisoController.verificar);
router.post('/asignar', detallePermisoController.asignar);
router.delete('/:id', detallePermisoController.remove);

export default router;