// middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 🟢 NUEVO: Verificar estado desde el token primero (más rápido)
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

        // 🟢 MODIFICADO: Incluir nuevos campos
        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: ['IdUsuario', 'Nombre', 'Correo', 'IdRol', 'Estado', 'Tipo'],
            include: [{
                model: Rol,
                as: 'Rol',
                attributes: ['IdRol', 'Nombre', 'Permisos']
            }]
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar estado actual en BD
        if (usuario.Estado === 'inactivo') {
            return res.status(403).json({
                success: false,
                message: 'Usuario inactivo'
            });
        }

        if (usuario.Estado === 'pendiente') {
            return res.status(403).json({
                success: false,
                message: 'Usuario pendiente de aprobación',
                redirectTo: '/pendiente-aprobacion'
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

            // 🟢 NUEVO: Admin siempre tiene acceso
            if (req.usuario.Tipo === 'admin') {
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
 * 🟢 MODIFICADO: Verificar permisos específicos (ahora más eficiente)
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

            // 🟢 NUEVO: Admin tiene todos los permisos
            if (req.usuario.Tipo === 'admin') {
                return next();
            }

            // Si no tiene rol, no tiene permisos
            if (!req.usuario.IdRol) {
                return res.status(403).json({
                    success: false,
                    message: 'Usuario sin rol asignado'
                });
            }

            // 🟢 MEJORADO: Buscar permiso de manera más eficiente
            const tienePermiso = await DetallePermiso.findOne({
                where: {
                    IdRol: req.usuario.IdRol,
                    IdPermiso: permisoRequerido
                },
                include: [{
                    model: Permiso,
                    as: 'Permiso',
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
 * 🟢 NUEVO: Verificar si el usuario puede modificar datos de clientes
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
        if (req.usuario.Tipo === 'admin') {
            return next();
        }

        // Cliente solo puede acceder a sus propios datos
        if (req.usuario.Tipo === 'cliente') {
            // El ID del cliente debe coincidir con el ID del usuario
            const clienteId = parseInt(req.params.id);
            if (clienteId === req.usuario.IdUsuario) {
                return next();
            }
            
            return res.status(403).json({
                success: false,
                message: 'No puede acceder a datos de otro cliente'
            });
        }

        // Empleados con permisos pueden acceder (se verifica con checkPermission aparte)
        next();
    } catch (error) {
        console.error('Error en checkClienteAccess:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar acceso'
        });
    }
};  