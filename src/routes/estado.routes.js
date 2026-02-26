// routes/estado.routes.js
import express from 'express';
const router = express.Router();
import estadoController from '../controllers/estado.controller.js';

/**
 * Rutas para el módulo de Estados
 * TEMPORAL: Sin autenticación para desarrollo
 */

// CRUD Principal - TODAS PÚBLICAS
router.get('/', estadoController.getAll);
router.get('/:id', estadoController.getById);
router.post('/', estadoController.create);
router.put('/:id', estadoController.update);
router.delete('/:id', estadoController.delete);

export default router;