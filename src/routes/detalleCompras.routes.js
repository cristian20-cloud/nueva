import express from 'express';
const router = express.Router();
import detalleCompraController from '../controllers/detalleCompras.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

// 🔐 Todo es administrativo
router.use(verifyToken);

router.get('/', detalleCompraController.getAll);
router.get('/compra/:compraId', detalleCompraController.getByCompra);
router.get('/:id', detalleCompraController.getById);

export default router;