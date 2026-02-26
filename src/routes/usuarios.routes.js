// routes/usuarios.routes.js
import express from 'express';
const router = express.Router();
import usuarioController from '../controllers/usuarios.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Usuarios
 * Base URL: /api/usuarios
 */

// Rutas de perfil personal
router.get('/perfil/mi-perfil', verifyToken, usuarioController.getMiPerfil);
router.put('/perfil/mi-perfil', verifyToken, usuarioController.updateMiPerfil);
router.post('/:id/cambiar-clave', verifyToken, usuarioController.cambiarClave);

// Todas las rutas siguientes requieren autenticación
router.use(verifyToken);

// Rutas de consulta
router.get('/activos', checkRole(['Administrador', 'Recursos Humanos']), usuarioController.getUsuariosActivos);
router.get('/estadisticas', checkRole(['Administrador']), usuarioController.getEstadisticas);

// CRUD Principal
router.get('/', checkRole(['Administrador', 'Recursos Humanos']), usuarioController.getAllUsuarios);
router.get('/:id', checkRole(['Administrador', 'Recursos Humanos']), usuarioController.getUsuarioById);
router.post('/', checkRole(['Administrador', 'Recursos Humanos']), usuarioController.createUsuario);
router.put('/:id', checkRole(['Administrador', 'Recursos Humanos']), usuarioController.updateUsuario);
router.delete('/:id', checkRole(['Administrador']), usuarioController.deleteUsuario);

// Rutas específicas
router.patch('/:id/estado', checkRole(['Administrador', 'Recursos Humanos']), usuarioController.toggleUsuarioStatus);

export default router;