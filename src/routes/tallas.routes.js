// routes/tallas.routes.js
import express from 'express';
const router = express.Router();
import tallaController from '../controllers/tallas.controller.js';

/**
 * Rutas para el módulo de Tallas
 * TEMPORAL: Sin autenticación para desarrollo
 */

// CRUD Principal - TODAS PÚBLICAS
router.get('/', tallaController.getAll);
router.get('/:id', tallaController.getById);
router.post('/', tallaController.create);
router.put('/:id', tallaController.update);
router.delete('/:id', tallaController.delete);

export default router;