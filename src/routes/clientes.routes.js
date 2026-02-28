// routes/clientes.routes.js
import express from 'express';
const router = express.Router();
import clienteController from '../controllers/clientes.controller.js';
import { verifyToken, checkPermission, checkClienteAccess } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Clientes
 * Base URL: /api/clientes
 */

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ============================================
// RUTAS PÚBLICAS DENTRO DEL API (solo token)
// ============================================
router.get('/activos', checkPermission('ver_clientes'), clienteController.getClientesActivos);
router.get('/estadisticas', checkPermission('ver_clientes'), clienteController.getEstadisticas);
router.get('/ciudad/:ciudad', checkPermission('ver_clientes'), clienteController.getClientesByCiudad);
router.get('/documento/:tipo/:numero', checkPermission('ver_clientes'), clienteController.getClienteByDocumento);

// ============================================
// CRUD PRINCIPAL
// ============================================
// GET - Ver clientes (permiso de ver)
router.get('/', checkPermission('ver_clientes'), clienteController.getAllClientes);
router.get('/:id', checkPermission('ver_clientes'), clienteController.getClienteById);

// POST - Crear cliente (permiso de crear)
router.post('/', checkPermission('crear_clientes'), clienteController.createCliente);

// PUT - Actualizar cliente (permiso de editar)
router.put('/:id', checkPermission('editar_clientes'), clienteController.updateCliente);

// DELETE - Eliminar cliente (permiso de eliminar)
router.delete('/:id', checkPermission('eliminar_clientes'), clienteController.deleteCliente);

// ============================================
// RUTAS ESPECÍFICAS
// ============================================
// Cambiar estado (activar/desactivar)
router.patch('/:id/estado', checkPermission('activar_clientes'), clienteController.toggleClienteStatus);

// Actualizar saldo (permiso específico para finanzas)
router.patch('/:id/saldo', checkPermission('editar_clientes_saldo'), clienteController.updateSaldo);

// ============================================
// RUTAS PARA EL PROPIO CLIENTE (acceso especial)
// ============================================
// El cliente puede ver su propio perfil sin permisos especiales
router.get('/mi/perfil', clienteController.getMiPerfil);
router.put('/mi/perfil', clienteController.updateMiPerfil);

export default router;