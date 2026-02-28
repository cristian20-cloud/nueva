// routes/usuarios.routes.js
import express from 'express';
const router = express.Router();
import usuarioController from '../controllers/usuarios.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Usuarios
 * Base URL: /api/usuarios
 * 
 * Gestión de usuarios del sistema
 */

// ============================================
// RUTAS DE PERFIL PERSONAL (acceso propio)
// ============================================
// Estas rutas no requieren permisos especiales
// porque cada usuario accede a SU propio perfil
router.get('/perfil/mi-perfil', verifyToken, usuarioController.getMiPerfil);
router.put('/perfil/mi-perfil', verifyToken, usuarioController.updateMiPerfil);
router.post('/perfil/cambiar-clave', verifyToken, usuarioController.cambiarMiClave);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(verifyToken);

// ============================================
// RUTAS DE CONSULTA (ver usuarios)
// ============================================
router.get('/', checkPermission('ver_usuarios'), usuarioController.getAllUsuarios);
router.get('/activos', checkPermission('ver_usuarios'), usuarioController.getUsuariosActivos);
router.get('/pendientes', checkPermission('ver_usuarios'), usuarioController.getUsuariosPendientes);
router.get('/estadisticas', checkPermission('ver_usuarios'), usuarioController.getEstadisticas);
router.get('/:id', checkPermission('ver_usuarios'), usuarioController.getUsuarioById);
router.get('/buscar', checkPermission('ver_usuarios'), usuarioController.buscarUsuarios);

// ============================================
// RUTAS DE ADMINISTRACIÓN (crear, editar)
// ============================================
// Crear usuario (admin)
router.post('/', checkPermission('crear_usuarios'), usuarioController.createUsuario);

// Actualizar usuario
router.put('/:id', checkPermission('editar_usuarios'), usuarioController.updateUsuario);

// Actualizar parcialmente
router.patch('/:id', checkPermission('editar_usuarios'), usuarioController.patchUsuario);

// ============================================
// RUTAS DE APROBACIÓN Y ESTADO
// ============================================
// Aprobar usuario pendiente
router.post('/:id/aprobar', checkPermission('aprobar_usuarios'), usuarioController.aprobarUsuario);

// Rechazar usuario pendiente
router.post('/:id/rechazar', checkPermission('aprobar_usuarios'), usuarioController.rechazarUsuario);

// Cambiar estado (activar/desactivar)
router.patch('/:id/estado', checkPermission('activar_usuarios'), usuarioController.toggleUsuarioStatus);

// ============================================
// RUTAS DE SEGURIDAD (contraseñas)
// ============================================
// Cambiar contraseña de otro usuario (admin)
router.post('/:id/cambiar-clave', checkPermission('editar_usuarios'), usuarioController.cambiarClave);

// Resetear contraseña (admin)
router.post('/:id/resetear-clave', checkPermission('editar_usuarios'), usuarioController.resetearClave);

// ============================================
// RUTAS DE ASIGNACIÓN DE ROLES
// ============================================
// Asignar rol a usuario
router.post('/:id/asignar-rol', checkPermission('editar_usuarios'), usuarioController.asignarRol);

// Quitar rol de usuario
router.delete('/:id/rol', checkPermission('editar_usuarios'), usuarioController.quitarRol);

// ============================================
// ELIMINACIÓN DE USUARIOS (solo admin)
// ============================================
// Eliminar usuario (¡CUIDADO!)
router.delete('/:id', checkPermission('eliminar_usuarios'), usuarioController.deleteUsuario);

export default router;