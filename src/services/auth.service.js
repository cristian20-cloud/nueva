// services/auth.service.js
const Usuario = require('../models/Usuarios');
const { generateToken, verifyToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/hash');

/**
 * Servicio de Autenticación
 * Lógica de negocio para autenticación
 */
const authService = {
    /**
     * Autenticar usuario
     */
    async authenticate(correo, clave) {
        const usuario = await Usuario.findOne({
            where: { Correo: correo.toLowerCase().trim() }
        });

        if (!usuario || !usuario.Estado) {
            return null;
        }

        const valida = await comparePassword(clave, usuario.Clave);
        if (!valida) {
            return null;
        }

        return usuario;
    },

    /**
     * Generar token JWT
     */
    generateToken(usuario) {
        return generateToken({
            id: usuario.IdUsuario,
            correo: usuario.Correo,
            rol: usuario.Rol?.Nombre
        });
    },

    /**
     * Verificar token
     */
    verifyToken(token) {
        return verifyToken(token);
    },

    /**
     * Cambiar contraseña
     */
    async changePassword(usuarioId, claveActual, claveNueva) {
        const usuario = await Usuario.findByPk(usuarioId);
        
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        const valida = await comparePassword(claveActual, usuario.Clave);
        if (!valida) {
            throw new Error('Contraseña actual incorrecta');
        }

        const hashedPassword = await hashPassword(claveNueva);
        usuario.Clave = hashedPassword;
        await usuario.save();

        return true;
    },

    /**
     * Registrar usuario
     */
    async register(userData) {
        const hashedPassword = await hashPassword(userData.Clave);
        
        const usuario = await Usuario.create({
            ...userData,
            Clave: hashedPassword,
            Correo: userData.Correo.toLowerCase().trim(),
            Estado: true
        });

        return usuario;
    }
};

module.exports = authService;