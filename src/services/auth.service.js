// services/auth.service.js
import Usuario from '../models/usuarios.model.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

/**
 * Servicio de Autenticación
 * Lógica de negocio para autenticación
 */
const authService = {
    /**
     * Autenticar usuario
     * @param {string} correo 
     * @param {string} clave 
     * @returns {Promise<Usuario|null>}
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
     * @param {Usuario} usuario 
     * @returns {string}
     */
    generateToken(usuario) {
        return generateToken({
            id: usuario.IdUsuario,
            correo: usuario.Correo,
            nombre: usuario.Nombre,
            tipo: usuario.Tipo,
            estado: usuario.Estado,
            rol: usuario.Rol?.Nombre,
            rolId: usuario.IdRol
        });
    },

    /**
     * Verificar token
     * @param {string} token 
     * @returns {object}
     */
    verifyToken(token) {
        return verifyToken(token);
    },

    /**
     * Cambiar contraseña
     * @param {number} usuarioId 
     * @param {string} claveActual 
     * @param {string} claveNueva 
     * @returns {Promise<boolean>}
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
     * @param {object} userData 
     * @returns {Promise<Usuario>}
     */
    async register(userData) {
        const hashedPassword = await hashPassword(userData.Clave);
        
        const usuario = await Usuario.create({
            ...userData,
            Clave: hashedPassword,
            Correo: userData.Correo.toLowerCase().trim(),
            Estado: userData.Estado || 'pendiente'
        });
        
        return usuario;
    }
};

export default authService;