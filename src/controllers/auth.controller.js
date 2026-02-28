// controllers/auth.controller.js
import dotenv from 'dotenv';
dotenv.config();

import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';
import Cliente from '../models/clientes.model.js';
import DetallePermiso from '../models/detallePermisos.model.js';
import Permiso from '../models/permisos.model.js';
import { generateToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validateLogin, validateRegistro } from '../utils/validationUtils.js';

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
        console.log('Firebase no disponible, se usará recuperación local');
    }
}

/**
 * Controlador de Autenticación
 * Maneja login, registro y verificación de usuarios
 */
const authController = {
    /**
     * 🟢 NUEVO: Registro de usuario (público - para clientes)
     * @route POST /api/auth/registro
     */
    registro: async (req, res) => {
        try {
            const { 
                nombre, 
                correo, 
                clave, 
                esCliente = true,
                datosCliente 
            } = req.body;

            // Validar datos básicos
            if (!nombre || !correo || !clave) {
                return errorResponse(res, 'Nombre, correo y clave son requeridos', 400);
            }

            // Verificar si el usuario ya existe
            const existe = await Usuario.findOne({
                where: { Correo: correo.toLowerCase().trim() }
            });

            if (existe) {
                return errorResponse(res, 'El correo ya está registrado', 400);
            }

            // Buscar rol por defecto para clientes (si existe)
            let IdRol = null;
            if (esCliente) {
                const rolCliente = await Rol.findOne({ 
                    where: { Nombre: 'Usuario' } 
                });
                IdRol = rolCliente?.IdRol || null;
            }

            // Crear usuario con estado 'pendiente'
            const nuevoUsuario = await Usuario.create({
                Nombre: nombre.trim(),
                Correo: correo.toLowerCase().trim(),
                Clave: clave,
                IdRol: IdRol,
                Tipo: esCliente ? 'cliente' : 'empleado',
                Estado: 'pendiente' // Requiere aprobación del admin
            });

            // Si es cliente y hay datos adicionales, crear registro en Clientes
            if (esCliente && datosCliente) {
                await Cliente.create({
                    ...datosCliente,
                    Nombre: nombre.trim(),
                    Correo: correo.toLowerCase().trim(),
                    IdUsuario: nuevoUsuario.IdUsuario
                });
            }

            return successResponse(res, {
                message: 'Registro exitoso. Espera aprobación del administrador.',
                redirectTo: '/pendiente-aprobacion',
                usuario: {
                    IdUsuario: nuevoUsuario.IdUsuario,
                    Nombre: nuevoUsuario.Nombre,
                    Correo: nuevoUsuario.Correo,
                    Tipo: nuevoUsuario.Tipo,
                    Estado: nuevoUsuario.Estado
                }
            }, 'Registro completado', 201);

        } catch (error) {
            console.error('❌ Error en registro:', error);
            return errorResponse(res, 'Error al registrar usuario', 500, error.message);
        }
    },

    /**
     * 🟢 MODIFICADO: Iniciar sesión con redirección según estado y tipo
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
                include: [
                    { 
                        model: Rol, 
                        as: 'Rol',
                        attributes: ['IdRol', 'Nombre', 'Permisos']
                    }
                ]
            });

            if (!usuario) {
                return errorResponse(res, 'Credenciales incorrectas', 401);
            }

            // Validar contraseña
            const claveValida = await usuario.validarClave(clave);
            if (!claveValida) {
                return errorResponse(res, 'Credenciales incorrectas', 401);
            }

            // Verificar estado y determinar redirección
            let redirectTo = '/dashboard';
            let mensaje = 'Login exitoso';

            switch(usuario.Estado) {
                case 'pendiente':
                    redirectTo = '/pendiente-aprobacion';
                    mensaje = 'Usuario pendiente de aprobación';
                    break;
                case 'inactivo':
                    return errorResponse(res, 'Usuario inactivo. Contacte al administrador', 403);
                case 'activo':
                    // Redirigir según tipo cuando está activo
                    if (usuario.Tipo === 'cliente') {
                        redirectTo = '/cliente/dashboard';
                    } else if (usuario.Tipo === 'admin' || usuario.Rol?.Nombre === 'Administrador') {
                        redirectTo = '/admin/dashboard';
                    }
                    break;
            }

            // Obtener permisos del rol
            let permisosArray = [];
            if (usuario.IdRol) {
                const detalles = await DetallePermiso.findAll({
                    where: { IdRol: usuario.IdRol },
                    include: [{ 
                        model: Permiso, 
                        as: 'Permiso',
                        attributes: ['IdPermiso', 'NombrePermiso']
                    }]
                });
                
                permisosArray = detalles
                    .map(d => d.Permiso?.NombrePermiso)
                    .filter(Boolean);
            }

            // Generar token con información completa
            const token = generateToken({
                id: usuario.IdUsuario,
                correo: usuario.Correo,
                nombre: usuario.Nombre,
                tipo: usuario.Tipo,
                estado: usuario.Estado,
                rol: usuario.Rol?.Nombre,
                rolId: usuario.IdRol,
                permisos: permisosArray
            });

            return successResponse(res, {
                usuario: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    Correo: usuario.Correo,
                    Tipo: usuario.Tipo,
                    Estado: usuario.Estado,
                    Rol: usuario.Rol?.Nombre,
                    permisos: permisosArray
                },
                token,
                redirectTo
            }, mensaje);

        } catch (error) {
            console.error('❌ Error en login:', error);
            return errorResponse(res, 'Error al iniciar sesión', 500, error.message);
        }
    },

    /**
     * 🟢 NUEVO: Verificar token y estado
     * @route GET /api/auth/verify
     */
    verify: async (req, res) => {
        try {
            // req.usuario viene del middleware verifyToken
            if (!req.usuario) {
                return errorResponse(res, 'Token no válido', 401);
            }

            // Verificar si el usuario sigue activo en BD
            const usuario = await Usuario.findByPk(req.usuario.id, {
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['IdRol', 'Nombre']
                }],
                attributes: { exclude: ['Clave'] }
            });

            if (!usuario) {
                return errorResponse(res, 'Usuario no encontrado', 401);
            }

            if (usuario.Estado === 'inactivo') {
                return errorResponse(res, 'Usuario inactivo', 403);
            }

            // Determinar redirección según estado
            let redirectTo = null;
            if (usuario.Estado === 'pendiente') {
                redirectTo = '/pendiente-aprobacion';
            }

            return successResponse(res, {
                usuario: usuario.toJSON(),
                redirectTo
            }, 'Token válido');

        } catch (error) {
            console.error('❌ Error en verify:', error);
            return errorResponse(res, 'Error al verificar token', 500, error.message);
        }
    },

    /**
     * 🟢 MODIFICADO: Registrar nuevo usuario (solo admin) - ahora con estado activo directo
     * @route POST /api/auth/register (admin)
     */
    register: async (req, res) => {
        try {
            const { nombre, correo, clave, idRol, tipo = 'empleado' } = req.body;

            // Verificar permisos (el middleware ya debería haberlo hecho)
            
            const existe = await Usuario.findOne({
                where: { Correo: correo.toLowerCase().trim() }
            });

            if (existe) {
                return errorResponse(res, 'El correo ya está registrado', 400);
            }

            // Los usuarios creados por admin ya están activos directamente
            const nuevoUsuario = await Usuario.create({
                Nombre: nombre.trim(),
                Correo: correo.toLowerCase().trim(),
                Clave: clave,
                IdRol: idRol,
                Tipo: tipo,
                Estado: 'activo' // Admin crea usuarios activos
            });

            return successResponse(res, {
                IdUsuario: nuevoUsuario.IdUsuario,
                Nombre: nuevoUsuario.Nombre,
                Correo: nuevoUsuario.Correo,
                Tipo: nuevoUsuario.Tipo,
                Estado: nuevoUsuario.Estado
            }, 'Usuario registrado exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en register:', error);
            return errorResponse(res, 'Error al registrar usuario', 500, error.message);
        }
    },

    /**
     * Cambiar contraseña
     * @route POST /api/auth/change-password
     */
    changePassword: async (req, res) => {
        try {
            const { claveActual, claveNueva } = req.body;
            const usuario = await Usuario.findByPk(req.usuario.id);

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

            if (!usuario || usuario.Estado === 'inactivo') {
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