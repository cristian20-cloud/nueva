// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import { verifyToken as verifyJwt } from '../utils/jwt.js';
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';
import DetallePermiso from '../models/detallePermisos.model.js';
import Permiso from '../models/permisos.model.js';

/**
 * Verificar token JWT
 */
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    const decoded = verifyJwt(token);

    // Verificar estado desde el token primero (más rápido)
    if (decoded.estado === 'inactivo') {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    if (decoded.estado === 'pendiente') {
      return res.status(403).json({
        success: false,
        message: 'Usuario pendiente de aprobación',
        redirectTo: '/pendiente-aprobacion'
      });
    }

    // 🔍 Buscar usuario por el ID del token (usando IdUsuario que es la PK)
    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{
        model: Rol,
        as: 'rolData'
      }]
    });

    if (!usuario) {
      console.log(`❌ Auth error: El usuario con ID ${decoded.id} no existe en la base de datos`);
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado en el sistema'
      });
    }

    // Verificar estado (Soportando "true", true o "activo")
    const isActive = usuario.Estado === 'activo' || usuario.Estado === 'true' || usuario.Estado === true;
    if (usuario.Estado === 'inactivo' || (!isActive && usuario.Estado !== 'pendiente')) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Usuario inactivo'
      });
    }

    if (usuario.Estado === 'pendiente') {
      return res.status(403).json({
        success: false,
        message: 'Usuario pendiente de aprobación',
        redirectTo: '/pendiente-aprobacion'
      });
    }

    // ✅ Inyectar para que el controlador lo reciba directamente
    req.usuario = usuario;
    req.rol = usuario.rolData;
    req.usuarioId = usuario.IdUsuario;
    
    console.log(`✅ Token verificado: ${usuario.Correo} logueado con éxito.`);
    next();
    
  } catch (error) {
    console.error('Error en verifyToken:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

/**
 * Verificar rol de usuario
 */
export const checkRole = (rolesPermitidos) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Admin siempre tiene acceso
      if (req.rol?.Nombre === 'Administrador') {
        return next();
      }

      const rol = await Rol.findByPk(req.usuario.IdRol);

      if (!rol) {
        return res.status(403).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      if (!rolesPermitidos.includes(rol.Nombre)) {
        return res.status(403).json({
          success: false,
          message: `No tiene permisos de ${rolesPermitidos.join(' o ')}`
        });
      }

      next();
      
    } catch (error) {
      console.error('Error en checkRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar rol'
      });
    }
  };
};

/**
 * Verificar permisos específicos
 */
export const checkPermission = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Admin tiene todos los permisos
      if (req.rol?.Nombre === 'Administrador') {
        return next();
      }

      // Si no tiene rol, no tiene permisos
      if (!req.usuario.IdRol) {
        return res.status(403).json({
          success: false,
          message: 'Usuario sin rol asignado'
        });
      }

      // ✅ CORREGIDO: Usar alias 'permisoData' que coincide con index.js
      const tienePermiso = await DetallePermiso.findOne({
        where: {
          IdRol: req.usuario.IdRol,
          IdPermiso: permisoRequerido
        },
        include: [{
          model: Permiso,
          as: 'permisoData',  // ← CAMBIADO: De 'Permiso' a 'permisoData'
          required: true
        }]
      });

      if (!tienePermiso) {
        return res.status(403).json({
          success: false,
          message: `No tiene permiso: ${permisoRequerido}`
        });
      }

      next();
      
    } catch (error) {
      console.error('Error en checkPermission:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos'
      });
    }
  };
};

/**
 * Verificar si el usuario puede modificar datos de clientes
 */
export const checkClienteAccess = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Admin puede acceder a cualquier cliente
    if (req.rol?.Nombre === 'Administrador') {
      return next();
    }

    // Cliente solo puede acceder a sus propios datos
    if (req.rol?.Nombre === 'Usuario' || req.rol?.Nombre === 'Cliente') {
      const clienteId = parseInt(req.params.id);
      if (clienteId === req.usuario.IdUsuario) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'No puede acceder a datos de otro cliente'
      });
    }

    // Empleados con permisos pueden acceder
    next();
    
  } catch (error) {
    console.error('Error en checkClienteAccess:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar acceso'
    });
  }
};

// El archivo ya exporta cada constante individualmente en su definición.
// Se mantiene un objeto default para compatibilidad opcional.
export default {
  verifyToken,
  checkRole,
  checkPermission,
  checkClienteAccess
};