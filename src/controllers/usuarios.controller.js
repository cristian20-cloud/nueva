// controllers/usuarios.controller.js
import { Op } from 'sequelize';
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';
import Cliente from '../models/clientes.model.js';
import DetallePermiso from '../models/detallePermisos.model.js';
import Permiso from '../models/permisos.model.js';
import { validateUsuario, validateCambioClave } from '../utils/validationUtils.js';
import { sequelize } from '../config/db.js';

const usuarioController = {
    /**
     * Obtener todos los usuarios con filtros
     * @route GET /api/usuarios
     */
    getAllUsuarios: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 7, 
                search = '', 
                rol,
                tipo,
                estado 
            } = req.query;

            const offset = (page - 1) * limit;

            // Construir filtros
            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { Nombre: { [Op.iLike]: `%${search}%` } },
                    { Correo: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            if (rol) {
                whereClause.IdRol = rol;
            }
            
            if (tipo) {
                whereClause.Tipo = tipo;
            }
            
            if (estado) {
                whereClause.Estado = estado;
            }

            // Consultar usuarios
            const { count, rows } = await Usuario.findAndCountAll({
                where: whereClause,
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['IdRol', 'Nombre']
                }],
                attributes: { exclude: ['Clave'] },
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Nombre', 'ASC']]
            });

            // Formatear respuesta con los nuevos campos
            const usuariosFormateados = rows.map(usuario => ({
                IdUsuario: usuario.IdUsuario,
                Nombre: usuario.Nombre,
                Email: usuario.Correo,
                Tipo: usuario.Tipo,
                Rol: usuario.Rol?.Nombre || 'Sin rol',
                IdRol: usuario.IdRol,
                Estado: usuario.Estado,
                EstadoTexto: usuario.Estado === 'activo' ? 'Activado' : 
                             usuario.Estado === 'pendiente' ? 'Pendiente' : 'Desactivado'
            }));

            const totalPages = Math.ceil(count / limit);

            res.json({
                success: true,
                data: usuariosFormateados,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    showingFrom: offset + 1,
                    showingTo: Math.min(offset + parseInt(limit), count)
                }
            });

        } catch (error) {
            console.error('❌ Error en getAllUsuarios:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener usuarios pendientes de aprobación
     * @route GET /api/usuarios/pendientes
     */
    getUsuariosPendientes: async (req, res) => {
        try {
            const usuarios = await Usuario.findAll({
                where: { Estado: 'pendiente' },
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['IdRol', 'Nombre']
                }],
                attributes: { exclude: ['Clave'] },
                order: [['createdAt', 'DESC']]
            });

            const formateados = usuarios.map(u => ({
                IdUsuario: u.IdUsuario,
                Nombre: u.Nombre,
                Correo: u.Correo,
                Tipo: u.Tipo,
                FechaRegistro: u.createdAt
            }));

            res.json({
                success: true,
                data: formateados
            });

        } catch (error) {
            console.error('❌ Error en getUsuariosPendientes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Aprobar usuario (cambiar estado a activo y asignar rol)
     * @route POST /api/usuarios/:id/aprobar
     */
    aprobarUsuario: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { IdRol } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            if (usuario.Estado !== 'pendiente') {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'El usuario no está pendiente' });
            }

            // Asignar rol y cambiar estado
            const updateData = {
                Estado: 'activo'
            };
            
            if (IdRol) {
                updateData.IdRol = IdRol;
            }

            await usuario.update(updateData, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                message: 'Usuario aprobado exitosamente',
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    Estado: usuario.Estado,
                    IdRol: usuario.IdRol
                }
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en aprobarUsuario:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Rechazar usuario
     * @route POST /api/usuarios/:id/rechazar
     */
    rechazarUsuario: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            await usuario.update({ 
                Estado: 'inactivo',
                MotivoRechazo: motivo || 'Sin motivo especificado'
            }, { transaction });
            
            await transaction.commit();

            res.json({
                success: true,
                message: 'Usuario rechazado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en rechazarUsuario:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener un usuario por ID
     * @route GET /api/usuarios/:id
     */
    getUsuarioById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id, {
                include: [
                    {
                        model: Rol,
                        as: 'Rol',
                        attributes: ['IdRol', 'Nombre', 'Descripcion']
                    },
                    {
                        model: Cliente,
                        as: 'Cliente',
                        required: false
                    }
                ],
                attributes: { exclude: ['Clave'] }
            });

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Obtener permisos del rol
            const permisos = await DetallePermiso.findAll({
                where: { IdRol: usuario.IdRol },
                include: [{
                    model: Permiso,
                    as: 'Permiso',
                    attributes: ['IdPermiso', 'Nombre', 'Modulo']
                }]
            });

            res.json({
                success: true,
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    Correo: usuario.Correo,
                    Tipo: usuario.Tipo,
                    Rol: usuario.Rol?.Nombre,
                    RolDescripcion: usuario.Rol?.Descripcion,
                    IdRol: usuario.IdRol,
                    Estado: usuario.Estado,
                    EstadoTexto: usuario.Estado === 'activo' ? 'Activado' : 
                                 usuario.Estado === 'pendiente' ? 'Pendiente' : 'Desactivado',
                    Cliente: usuario.Cliente,
                    Permisos: permisos.map(p => p.Permiso)
                }
            });

        } catch (error) {
            console.error('❌ Error en getUsuarioById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear un nuevo usuario (admin)
     * @route POST /api/usuarios
     */
    createUsuario: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { Nombre, Correo, Clave, IdRol, Tipo = 'empleado' } = req.body;

            // Validar datos
            const validationErrors = await validateUsuario(req.body);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            // Verificar rol si se proporciona
            if (IdRol) {
                const rol = await Rol.findByPk(IdRol);
                if (!rol || !rol.Estado) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Rol no válido' });
                }
            }

            // Crear usuario (admin crea usuarios activos)
            const nuevoUsuario = await Usuario.create({
                Nombre: Nombre.trim(),
                Correo: Correo.toLowerCase().trim(),
                Clave,
                IdRol,
                Tipo,
                Estado: 'activo' // Admin crea usuarios activos
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: {
                    IdUsuario: nuevoUsuario.IdUsuario,
                    Nombre: nuevoUsuario.Nombre,
                    Correo: nuevoUsuario.Correo,
                    Tipo: nuevoUsuario.Tipo,
                    IdRol: nuevoUsuario.IdRol,
                    Estado: nuevoUsuario.Estado
                },
                message: 'Usuario creado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createUsuario:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
            }
            
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar un usuario
     * @route PUT /api/usuarios/:id
     */
    updateUsuario: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { Nombre, Correo, IdRol, Estado, Tipo } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Validar datos
            const validationErrors = await validateUsuario({ Nombre, Correo, IdRol, Estado, Tipo }, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre.trim();
            if (Correo) updateData.Correo = Correo.toLowerCase().trim();
            if (IdRol) updateData.IdRol = IdRol;
            if (Tipo) updateData.Tipo = Tipo;
            if (Estado) updateData.Estado = Estado;

            await usuario.update(updateData, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    Correo: usuario.Correo,
                    Tipo: usuario.Tipo,
                    IdRol: usuario.IdRol,
                    Estado: usuario.Estado
                },
                message: 'Usuario actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateUsuario:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
            }
            
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualización parcial de usuario
     * @route PATCH /api/usuarios/:id
     */
    patchUsuario: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            await usuario.update(req.body, { transaction });
            await transaction.commit();

            res.json({ 
                success: true, 
                data: usuario, 
                message: 'Usuario actualizado parcialmente' 
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en patchUsuario:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Eliminar un usuario (desactivar)
     * @route DELETE /api/usuarios/:id
     */
    deleteUsuario: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // No permitir eliminar al propio usuario
            if (usuario.IdUsuario === req.usuario.IdUsuario) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'No puede eliminarse a sí mismo' });
            }

            await usuario.update({ Estado: 'inactivo' }, { transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Usuario desactivado exitosamente' });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteUsuario:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Cambiar estado del usuario (activar/desactivar)
     * @route PATCH /api/usuarios/:id/estado
     */
    toggleUsuarioStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // No permitir desactivar al propio usuario
            if (usuario.IdUsuario === req.usuario.IdUsuario && usuario.Estado === 'activo') {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'No puede desactivarse a sí mismo' });
            }

            const nuevoEstado = usuario.Estado === 'activo' ? 'inactivo' : 'activo';
            await usuario.update({ Estado: nuevoEstado }, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Estado: usuario.Estado,
                    EstadoTexto: usuario.Estado === 'activo' ? 'Activado' : 'Desactivado'
                },
                message: `Usuario ${usuario.Estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleUsuarioStatus:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Cambiar contraseña (admin o propio usuario)
     * @route POST /api/usuarios/:id/cambiar-clave
     */
    cambiarClave: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { claveActual, claveNueva } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            // Verificar permisos
            if (req.usuario.IdUsuario !== parseInt(id) && req.usuario.Tipo !== 'admin') {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'No tiene permisos' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Validar contraseña
            const errors = validateCambioClave({ claveActual, claveNueva });
            if (errors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors });
            }

            // Verificar contraseña actual (solo si es el propio usuario)
            if (req.usuario.IdUsuario === parseInt(id)) {
                const valida = await usuario.validarClave(claveActual);
                if (!valida) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
                }
            }

            // Actualizar contraseña
            usuario.Clave = claveNueva;
            await usuario.save({ transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Contraseña cambiada exitosamente' });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en cambiarClave:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Cambiar mi propia contraseña
     * @route POST /api/usuarios/perfil/cambiar-clave
     */
    cambiarMiClave: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { claveActual, claveNueva } = req.body;
            const usuario = await Usuario.findByPk(req.usuario.IdUsuario);

            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Validar contraseña
            const errors = validateCambioClave({ claveActual, claveNueva });
            if (errors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors });
            }

            // Verificar contraseña actual
            const valida = await usuario.validarClave(claveActual);
            if (!valida) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
            }

            // Actualizar contraseña
            usuario.Clave = claveNueva;
            await usuario.save({ transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Contraseña cambiada exitosamente' });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en cambiarMiClave:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Resetear contraseña (admin)
     * @route POST /api/usuarios/:id/resetear-clave
     */
    resetearClave: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { nuevaClave } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Generar contraseña por defecto si no se proporciona
            const claveFinal = nuevaClave || '123456';

            usuario.Clave = claveFinal;
            await usuario.save({ transaction });
            await transaction.commit();

            res.json({ 
                success: true, 
                message: `Contraseña reseteada exitosamente${!nuevaClave ? ' (contraseña por defecto: 123456)' : ''}` 
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en resetearClave:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Asignar rol a usuario
     * @route POST /api/usuarios/:id/asignar-rol
     */
    asignarRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { IdRol } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Verificar rol
            const rol = await Rol.findByPk(IdRol);
            if (!rol || !rol.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Rol no válido' });
            }

            await usuario.update({ IdRol }, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    IdRol: usuario.IdRol,
                    Rol: rol.Nombre
                },
                message: 'Rol asignado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en asignarRol:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Quitar rol de usuario
     * @route DELETE /api/usuarios/:id/rol
     */
    quitarRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
            }

            const usuario = await Usuario.findByPk(id);
            if (!usuario) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            await usuario.update({ IdRol: null }, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                message: 'Rol removido exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en quitarRol:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener usuarios activos (para selects)
     * @route GET /api/usuarios/activos
     */
    getUsuariosActivos: async (req, res) => {
        try {
            const usuarios = await Usuario.findAll({
                where: { Estado: 'activo' },
                attributes: ['IdUsuario', 'Nombre', 'Correo', 'Tipo'],
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['Nombre']
                }],
                order: [['Nombre', 'ASC']]
            });

            const usuariosFormateados = usuarios.map(u => ({
                IdUsuario: u.IdUsuario,
                Nombre: u.Nombre,
                Correo: u.Correo,
                Tipo: u.Tipo,
                Rol: u.Rol?.Nombre
            }));

            res.json({ success: true, data: usuariosFormateados });

        } catch (error) {
            console.error('❌ Error en getUsuariosActivos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Buscar usuarios
     * @route GET /api/usuarios/buscar
     */
    buscarUsuarios: async (req, res) => {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.json({ success: true, data: [] });
            }

            const usuarios = await Usuario.findAll({
                where: {
                    [Op.or]: [
                        { Nombre: { [Op.iLike]: `%${q}%` } },
                        { Correo: { [Op.iLike]: `%${q}%` } }
                    ],
                    Estado: 'activo'
                },
                attributes: ['IdUsuario', 'Nombre', 'Correo', 'Tipo'],
                limit: 10
            });

            res.json({ success: true, data: usuarios });

        } catch (error) {
            console.error('❌ Error en buscarUsuarios:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener perfil del usuario actual
     * @route GET /api/usuarios/perfil
     */
    getMiPerfil: async (req, res) => {
        try {
            const usuario = await Usuario.findByPk(req.usuario.IdUsuario, {
                include: [
                    {
                        model: Rol,
                        as: 'Rol',
                        attributes: ['IdRol', 'Nombre', 'Descripcion', 'Permisos']
                    },
                    {
                        model: Cliente,
                        as: 'Cliente',
                        required: false
                    }
                ],
                attributes: { exclude: ['Clave'] }
            });

            // Obtener permisos detallados
            let permisos = [];
            if (usuario.IdRol) {
                permisos = await DetallePermiso.findAll({
                    where: { IdRol: usuario.IdRol },
                    include: [{
                        model: Permiso,
                        as: 'Permiso',
                        attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
                    }]
                });
            }

            res.json({ 
                success: true, 
                data: {
                    ...usuario.toJSON(),
                    permisosDetalle: permisos.map(p => p.Permiso)
                }
            });

        } catch (error) {
            console.error('❌ Error en getMiPerfil:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar perfil del usuario actual
     * @route PUT /api/usuarios/perfil
     */
    updateMiPerfil: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { Nombre, Correo } = req.body;
            const usuario = await Usuario.findByPk(req.usuario.IdUsuario);

            // Validar datos
            const errors = await validateUsuario({ Nombre, Correo }, usuario.IdUsuario);
            if (errors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors });
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre.trim();
            if (Correo) updateData.Correo = Correo.toLowerCase().trim();

            await usuario.update(updateData, { transaction });
            
            // Si es cliente, actualizar también en tabla Clientes
            if (usuario.Tipo === 'cliente') {
                await Cliente.update(
                    { Nombre, Correo: Correo?.toLowerCase().trim() },
                    { where: { IdUsuario: usuario.IdUsuario }, transaction }
                );
            }
            
            await transaction.commit();

            res.json({ success: true, message: 'Perfil actualizado exitosamente' });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateMiPerfil:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas de usuarios
     * @route GET /api/usuarios/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalUsuarios = await Usuario.count();
            const activos = await Usuario.count({ where: { Estado: 'activo' } });
            const pendientes = await Usuario.count({ where: { Estado: 'pendiente' } });
            const inactivos = await Usuario.count({ where: { Estado: 'inactivo' } });
            
            // Usuarios por rol
            const usuariosPorRol = await Usuario.findAll({
                attributes: [
                    'IdRol',
                    [sequelize.fn('COUNT', sequelize.col('Usuario.IdUsuario')), 'cantidad']
                ],
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['Nombre']
                }],
                where: { Estado: 'activo' },
                group: ['IdRol']
            });

            // Usuarios por tipo
            const usuariosPorTipo = await Usuario.findAll({
                attributes: [
                    'Tipo',
                    [sequelize.fn('COUNT', sequelize.col('Usuario.IdUsuario')), 'cantidad']
                ],
                group: ['Tipo']
            });

            res.json({
                success: true,
                data: {
                    total: totalUsuarios,
                    activos,
                    pendientes,
                    inactivos,
                    usuariosPorRol: usuariosPorRol.map(item => ({
                        rol: item.Rol?.Nombre,
                        cantidad: parseInt(item.dataValues.cantidad)
                    })),
                    usuariosPorTipo: usuariosPorTipo.map(item => ({
                        tipo: item.Tipo,
                        cantidad: parseInt(item.dataValues.cantidad)
                    }))
                }
            });

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default usuarioController;