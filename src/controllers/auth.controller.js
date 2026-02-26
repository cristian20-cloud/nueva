// controllers/auth.controller.js
import dotenv from 'dotenv';
dotenv.config();

import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';
import { generateToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validateLogin } from '../utils/validationUtils.js';

// 🔥 Firebase opcional - importación dinámica
let firebaseAuth = null;
let sendPasswordResetEmail = null;

// Intentar cargar Firebase solo si las variables existen
if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_AUTH_DOMAIN) {
    try {
        const { initializeApp } = await import('firebase/app');
        const { getAuth, sendPasswordResetEmail: sendEmail } = await import('firebase/auth');
        
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        };
        
        const firebaseApp = initializeApp(firebaseConfig);
        firebaseAuth = getAuth(firebaseApp);
        sendPasswordResetEmail = sendEmail;
    } catch (error) {
        // Silenciar errores de Firebase
    }
}

/**
 * Controlador de Autenticación
 * Maneja login, registro y verificación de usuarios
 */
const authController = {
    /**
     * Iniciar sesión
     * @route POST /api/auth/login
     */
    login: async (req, res) => {
        try {
            const { correo, clave } = req.body;

            const errors = validateLogin({ correo, clave });
            if (errors.length > 0) {
                return errorResponse(res, 'Datos inválidos', 400, errors);
            }

            const usuario = await Usuario.findOne({
                where: { Correo: correo.toLowerCase().trim() },
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['IdRol', 'Nombre']
                }]
            });

            if (!usuario) {
                return errorResponse(res, 'Credenciales incorrectas', 401);
            }

            if (!usuario.Estado) {
                return errorResponse(res, 'Usuario inactivo. Contacte al administrador', 401);
            }

            const claveValida = await usuario.validarClave(clave);
            if (!claveValida) {
                return errorResponse(res, 'Credenciales incorrectas', 401);
            }

            const token = generateToken({
                id: usuario.IdUsuario,
                correo: usuario.Correo,
                rol: usuario.Rol?.Nombre
            });

            return successResponse(res, {
                usuario: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    Correo: usuario.Correo,
                    Rol: usuario.Rol?.Nombre,
                    IdRol: usuario.IdRol
                },
                token
            }, 'Login exitoso');

        } catch (error) {
            console.error('❌ Error en login:', error);
            return errorResponse(res, 'Error al iniciar sesión', 500, error.message);
        }
    },

    /**
     * Registrar nuevo usuario (solo admin)
     * @route POST /api/auth/register
     */
    register: async (req, res) => {
        try {
            const { nombre, correo, clave, idRol } = req.body;

            const existe = await Usuario.findOne({
                where: { Correo: correo.toLowerCase().trim() }
            });

            if (existe) {
                return errorResponse(res, 'El correo ya está registrado', 400);
            }

            const nuevoUsuario = await Usuario.create({
                Nombre: nombre.trim(),
                Correo: correo.toLowerCase().trim(),
                Clave: clave,
                IdRol: idRol,
                Estado: true
            });

            return successResponse(res, {
                IdUsuario: nuevoUsuario.IdUsuario,
                Nombre: nuevoUsuario.Nombre,
                Correo: nuevoUsuario.Correo
            }, 'Usuario registrado exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en register:', error);
            return errorResponse(res, 'Error al registrar usuario', 500, error.message);
        }
    },

    /**
     * Verificar token
     * @route GET /api/auth/verify
     */
    verify: async (req, res) => {
        try {
            const usuario = await Usuario.findByPk(req.usuario.IdUsuario, {
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['IdRol', 'Nombre']
                }],
                attributes: { exclude: ['Clave'] }
            });

            if (!usuario || !usuario.Estado) {
                return errorResponse(res, 'Token inválido o usuario inactivo', 401);
            }

            return successResponse(res, usuario, 'Token válido');

        } catch (error) {
            console.error('❌ Error en verify:', error);
            return errorResponse(res, 'Error al verificar token', 500, error.message);
        }
    },

    /**
     * Cambiar contraseña
     * @route POST /api/auth/change-password
     */
    changePassword: async (req, res) => {
        try {
            const { claveActual, claveNueva } = req.body;
            const usuario = await Usuario.findByPk(req.usuario.IdUsuario);

            if (!usuario) {
                return errorResponse(res, 'Usuario no encontrado', 404);
            }

            const valida = await usuario.validarClave(claveActual);
            if (!valida) {
                return errorResponse(res, 'Contraseña actual incorrecta', 400);
            }

            if (!claveNueva || claveNueva.length < 6) {
                return errorResponse(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
            }

            usuario.Clave = claveNueva;
            await usuario.save();

            return successResponse(res, null, 'Contraseña actualizada exitosamente');

        } catch (error) {
            console.error('❌ Error en changePassword:', error);
            return errorResponse(res, 'Error al cambiar contraseña', 500, error.message);
        }
    },

    /**
     * Recuperar contraseña con Firebase
     * @route POST /api/auth/forgot-password
     */
    forgotPassword: async (req, res) => {
        try {
            const { correo } = req.body;

            if (!correo || correo.trim() === '') {
                return errorResponse(res, 'Debe proporcionar un correo electrónico', 400);
            }

            if (!firebaseAuth || !sendPasswordResetEmail) {
                return successResponse(res, null, 'Si el correo existe, recibirás instrucciones');
            }

            const usuario = await Usuario.findOne({
                where: { Correo: correo.toLowerCase().trim() }
            });

            if (!usuario || !usuario.Estado) {
                return successResponse(res, null, 'Si el correo existe, recibirás instrucciones');
            }

            await sendPasswordResetEmail(firebaseAuth, correo);

            return successResponse(res, null, 'Instrucciones enviadas al correo');

        } catch (error) {
            console.error('❌ Error en forgotPassword:', error);
            
            if (error.code === 'auth/invalid-email') {
                return errorResponse(res, 'Correo electrónico inválido', 400);
            }
            
            return successResponse(res, null, 'Si el correo existe, recibirás instrucciones');
        }
    }
};

export default authController;