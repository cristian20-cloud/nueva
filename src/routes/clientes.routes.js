// routes/clientes.routes.js
import express from 'express';
const router = express.Router();
import clienteController from '../controllers/clientes.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Clientes
 * Base URL: /api/clientes
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas públicas dentro del API (requieren token pero no roles específicos)
router.get('/activos', clienteController.getClientesActivos);
router.get('/estadisticas', clienteController.getEstadisticas);
router.get('/ciudad/:ciudad', clienteController.getClientesByCiudad);
router.get('/documento/:tipo/:numero', clienteController.getClienteByDocumento);

// CRUD Principal
router.get('/', clienteController.getAllClientes);
router.get('/:id', clienteController.getClienteById);
router.post('/', checkRole(['ADMIN', 'SUPERVISOR', 'VENDEDOR']), clienteController.createCliente);
router.put('/:id', checkRole(['ADMIN', 'SUPERVISOR']), clienteController.updateCliente);
router.delete('/:id', checkRole(['ADMIN']), clienteController.deleteCliente);

// Rutas específicas
router.patch('/:id/estado', checkRole(['ADMIN', 'SUPERVISOR']), clienteController.toggleClienteStatus);
router.patch('/:id/saldo', checkRole(['ADMIN', 'SUPERVISOR', 'CAJERO']), clienteController.updateSaldo);

export default router;