// controllers/auth.controller.js
import dotenv from 'dotenv';
dotenv.config();
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';
import Cliente from '../models/clientes.model.js';
import DetallePermiso from '../models/detallePermisos.model.js';
import Permiso from '../models/permisos.model.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { validateLogin, validateRegistro } from '../utils/validationUtils.js';

let firebaseAuth = null;
let sendPasswordResetEmail = null;

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

const authController = {
  registro: async (req, res) => {
    try {
      const { nombre, correo, clave, esCliente = true, datosCliente } = req.body;
      
      if (!nombre || !correo || !clave) {
        return errorResponse(res, 'Nombre, correo y clave son requeridos', 400);
      }

      const existe = await Usuario.findOne({
        where: { Correo: correo.toLowerCase().trim() }
      });

      if (existe) {
        return errorResponse(res, 'El correo ya está registrado', 400);
      }

      let IdRol = null;
      if (esCliente) {
        const rolCliente = await Rol.findOne({ where: { Nombre: 'Usuario' } });
        IdRol = rolCliente?.IdRol || null;
      }

      const nuevoUsuario = await Usuario.create({
        Nombre: nombre.trim(),
        Correo: correo.toLowerCase().trim(),
        Clave: clave,
        IdRol: IdRol,
        Estado: 'pendiente'
      });

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
          Estado: nuevoUsuario.Estado
        }
      }, 'Registro completado', 201);

    } catch (error) {
      console.error('❌ Error en registro:', error);
      return errorResponse(res, 'Error al registrar usuario', 500, error.message);
    }
  },

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
          attributes: ['IdRol', 'Nombre', 'Permisos']
        }]
      });

      if (!usuario) {
        return errorResponse(res, 'Credenciales incorrectas', 401);
      }

      const claveValida = await usuario.validarClave(clave);
      if (!claveValida) {
        return errorResponse(res, 'Credenciales incorrectas', 401);
      }

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
          const rolNombre = usuario.Rol?.Nombre;
          if (rolNombre === 'Usuario') {
            redirectTo = '/cliente/dashboard';
          } else if (rolNombre === 'Administrador') {
            redirectTo = '/admin/dashboard';
          }
          break;
      }

      let permisosArray = [];
      if (usuario.IdRol) {
        const detalles = await DetallePermiso.findAll({
          where: { IdRol: usuario.IdRol },
          include: [{ 
            model: Permiso, 
            as: 'Permiso',
            attributes: ['IdPermiso', 'Nombre']
          }]
        });
        
        permisosArray = detalles
          .map(d => d.Permiso?.Nombre)    
          .filter(Boolean);
      }

      // ✅ GENERAR AMBOS TOKENS
      const accessToken = generateToken({
        id: usuario.IdUsuario,
gits        correo: usuario.Correo,
        nombre: usuario.Nombre,
        estado: usuario.Estado,
        rol: usuario.Rol?.Nombre,
        rolId: usuario.IdRol,
        permisos: permisosArray
      });

      const refreshToken = generateRefreshToken({
        id: usuario.IdUsuario,
        correo: usuario.Correo,
        rol: usuario.Rol?.Nombre,
        rolId: usuario.IdRol
      });

      return successResponse(res, {
        usuario: {
          IdUsuario: usuario.IdUsuario,
          Nombre: usuario.Nombre,
          Correo: usuario.Correo,
          Estado: usuario.Estado,
          Rol: usuario.Rol?.Nombre,
          permisos: permisosArray
        },
        accessToken,      // ✅ CAMBIADO de 'token' a 'accessToken'
        refreshToken,     // ✅ AGREGADO
        token: accessToken, // ✅ Mantener compatibilidad con frontend
        redirectTo
      }, mensaje);

    } catch (error) {
      console.error('❌ Error en login:', error);
      return errorResponse(res, 'Error al iniciar sesión', 500, error.message);
    }
  },

  // ✅ NUEVO ENDPOINT PARA REFRESCAR TOKEN
  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return errorResponse(res, 'Refresh token requerido', 400);
      }

      // Verificar refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Buscar usuario para verificar que siga activo
      const usuario = await Usuario.findByPk(decoded.id, {
        include: [{ 
          model: Rol, 
          as: 'Rol',
          attributes: ['IdRol', 'Nombre']
        }]
      });

      if (!usuario) {
        return errorResponse(res, 'Usuario no encontrado', 404);
      }

      if (usuario.Estado === 'inactivo') {
        return errorResponse(res, 'Usuario inactivo', 403);
      }

      // Generar nuevos tokens
      let permisosArray = [];
      if (usuario.IdRol) {
        const detalles = await DetallePermiso.findAll({
          where: { IdRol: usuario.IdRol },
          include: [{ 
            model: Permiso, 
            as: 'Permiso',
            attributes: ['IdPermiso', 'Nombre']
          }]
        });
        
        permisosArray = detalles
          .map(d => d.Permiso?.Nombre)    
          .filter(Boolean);
      }

      const newAccessToken = generateToken({
        id: usuario.IdUsuario,
        correo: usuario.Correo,
        nombre: usuario.Nombre,
        estado: usuario.Estado,
        rol: usuario.Rol?.Nombre,
        rolId: usuario.IdRol,
        permisos: permisosArray
      });

      const newRefreshToken = generateRefreshToken({
        id: usuario.IdUsuario,
        correo: usuario.Correo,
        rol: usuario.Rol?.Nombre,
        rolId: usuario.IdRol
      });

      return successResponse(res, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        token: newAccessToken // Compatibilidad
      }, 'Token refrescado exitosamente');

    } catch (error) {
      console.error('❌ Error en refresh:', error);
      return errorResponse(res, 'Refresh token inválido o expirado', 403, error.message);
    }
  },

  verify: async (req, res) => {
    try {
      if (!req.usuario) {
        return errorResponse(res, 'Token no válido', 401);
      }

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
        Estado: 'activo'
      });

      return successResponse(res, {
        IdUsuario: nuevoUsuario.IdUsuario,
        Nombre: nuevoUsuario.Nombre,
        Correo: nuevoUsuario.Correo,
        Estado: nuevoUsuario.Estado
      }, 'Usuario registrado exitosamente', 201);

    } catch (error) {
      console.error('❌ Error en register:', error);
      return errorResponse(res, 'Error al registrar usuario', 500, error.message);
    }
  },

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