// routes/permisos.routes.js
import express from 'express';
const router = express.Router();
import permisoController from '../controllers/permisos.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js'; 

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas de consulta (accesibles por varios roles)
router.get('/verificar', permisoController.verificarPermiso);
router.get('/rol/:rolId', permisoController.getPermisosByRol);

// Rutas restringidas a administradores
router.get('/', checkRole(['Administrador']), permisoController.getAllPermisos);
router.post('/init', checkRole(['Administrador']), permisoController.initPermisos);

export default router;