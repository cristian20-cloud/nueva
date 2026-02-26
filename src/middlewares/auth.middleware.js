// middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: ['IdUsuario', 'Nombre', 'Correo', 'IdRol', 'Estado'],
            include: [{
                model: Rol,
                as: 'Rol',
                attributes: ['IdRol', 'Nombre']
            }]
        });

        if (!usuario || !usuario.Estado) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autorizado o inactivo'
            });
        }

        req.usuario = usuario;
        req.rol = usuario.Rol;
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
export const checkPermission = (permisosRequeridos) => {
    return async (req, res, next) => {
        try {
            if (!req.usuario) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }

            const DetallePermiso = (await import('../models/detallePermisos.model.js')).default;
            
            const tienePermiso = await DetallePermiso.findOne({
                where: {
                    IdRol: req.usuario.IdRol,
                    IdPermiso: permisosRequeridos
                }
            });

            if (!tienePermiso) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para realizar esta acción'
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