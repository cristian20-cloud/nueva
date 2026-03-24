// routes/productos.routes.js
import express from 'express';
const router = express.Router();
import productoController from '../controllers/productos.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

router.use(verifyToken);

// Estas funciones SI existen en tu controlador
router.get('/', productoController.getAllProductos);
router.get('/:id', productoController.getProductoById);
router.post('/', checkRole(['Administrador']), productoController.createProducto);
router.put('/:id', checkRole(['Administrador']), productoController.updateProducto);
router.put('/:id/oferta', checkRole(['Administrador']), productoController.toggleOferta);
router.delete('/:id', checkRole(['Administrador']), productoController.deleteProducto);

// CUALQUIER OTRA RUTA HACIA 'buscarProductos' O 'actualizarStock' DEBE SER BORRADA
// YA QUE NO ESTÁN EN EL ARCHIVO CONTROLLER QUE ENVIASTE.

export default router;