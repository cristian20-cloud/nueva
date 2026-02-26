// routes/imagenes.routes.js
import express from 'express';
const router = express.Router();
import imagenController from '../controllers/imagenes.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas públicas dentro del API
router.get('/producto/:productoId', imagenController.getByProducto);
router.get('/:id', imagenController.getById);

// Rutas restringidas
router.post('/', checkRole(['Administrador', 'Inventario']), imagenController.create);
router.post('/multiples', checkRole(['Administrador', 'Inventario']), imagenController.createMultiple);
router.put('/:id', checkRole(['Administrador', 'Inventario']), imagenController.update);
router.delete('/:id', checkRole(['Administrador']), imagenController.delete);

export default router;