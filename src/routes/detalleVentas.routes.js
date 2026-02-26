// routes/detalleVentas.routes.js
import express from 'express';
const router = express.Router();
import detalleVentaController from '../controllers/detalleVentas.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas específicas
router.get('/venta/:ventaId', detalleVentaController.getByVenta);
router.post('/', checkRole(['Administrador', 'Vendedor']), detalleVentaController.create);
router.put('/:id', checkRole(['Administrador', 'Vendedor']), detalleVentaController.update);
router.delete('/:id', checkRole(['Administrador']), detalleVentaController.delete);

export default router;