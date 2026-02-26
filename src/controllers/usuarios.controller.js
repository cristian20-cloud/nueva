// controllers/usuarios.controller.js
import { Op } from 'sequelize';
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';
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
            
            if (estado !== undefined) {
                whereClause.Estado = estado === 'true' || estado === 'Activado';
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

            // Formatear respuesta
            const usuariosFormateados = rows.map(usuario => ({
                IdUsuario: usuario.IdUsuario,
                Nombre: usuario.Nombre,
                Email: usuario.Correo,
                Rol: usuario.Rol?.Nombre || 'Sin rol',
                IdRol: usuario.IdRol,
                Estado: usuario.Estado ? 'Activado' : 'Desactivado',
                EstadoValor: usuario.Estado
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
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['IdRol', 'Nombre']
                }],
                attributes: { exclude: ['Clave'] }
            });

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            res.json({
                success: true,
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    Correo: usuario.Correo,
                    Rol: usuario.Rol?.Nombre,
                    IdRol: usuario.IdRol,
                    Estado: usuario.Estado,
                    EstadoTexto: usuario.Estado ? 'Activado' : 'Desactivado'
                }
            });

        } catch (error) {
            console.error('❌ Error en getUsuarioById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear un nuevo usuario
     * @route POST /api/usuarios
     */
    createUsuario: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { Nombre, Correo, Clave, IdRol } = req.body;

            // Validar datos
            const validationErrors = await validateUsuario(req.body);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            // Verificar rol
            const rol = await Rol.findByPk(IdRol);
            if (!rol || !rol.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Rol no válido' });
            }

            // Crear usuario
            const nuevoUsuario = await Usuario.create({
                Nombre: Nombre.trim(),
                Correo: Correo.toLowerCase().trim(),
                Clave,
                IdRol,
                Estado: true
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: {
                    IdUsuario: nuevoUsuario.IdUsuario,
                    Nombre: nuevoUsuario.Nombre,
                    Correo: nuevoUsuario.Correo,
                    IdRol: nuevoUsuario.IdRol
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
            const { Nombre, Correo, IdRol, Estado } = req.body;

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
            const validationErrors = await validateUsuario({ Nombre, Correo, IdRol, Estado }, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre.trim();
            if (Correo) updateData.Correo = Correo.toLowerCase().trim();
            if (IdRol) updateData.IdRol = IdRol;
            if (Estado !== undefined) updateData.Estado = Estado;

            await usuario.update(updateData, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Nombre: usuario.Nombre,
                    Correo: usuario.Correo,
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

            await usuario.update({ Estado: false }, { transaction });
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
            if (usuario.IdUsuario === req.usuario.IdUsuario && usuario.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'No puede desactivarse a sí mismo' });
            }

            await usuario.update({ Estado: !usuario.Estado }, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdUsuario: usuario.IdUsuario,
                    Estado: usuario.Estado,
                    EstadoTexto: usuario.Estado ? 'Activado' : 'Desactivado'
                },
                message: `Usuario ${usuario.Estado ? 'activado' : 'desactivado'} exitosamente`
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
            if (req.usuario.IdUsuario !== parseInt(id) && req.usuario.Rol?.Nombre !== 'Administrador') {
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
     * Obtener usuarios activos (para selects)
     * @route GET /api/usuarios/activos
     */
    getUsuariosActivos: async (req, res) => {
        try {
            const usuarios = await Usuario.findAll({
                where: { Estado: true },
                attributes: ['IdUsuario', 'Nombre', 'Correo'],
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
                Rol: u.Rol?.Nombre
            }));

            res.json({ success: true, data: usuariosFormateados });

        } catch (error) {
            console.error('❌ Error en getUsuariosActivos:', error);
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
                include: [{
                    model: Rol,
                    as: 'Rol',
                    attributes: ['Nombre']
                }],
                attributes: { exclude: ['Clave'] }
            });

            res.json({ success: true, data: usuario });

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
            const activos = await Usuario.count({ where: { Estado: true } });
            const inactivos = await Usuario.count({ where: { Estado: false } });
            
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
                group: ['IdRol']
            });

            res.json({
                success: true,
                data: {
                    total: totalUsuarios,
                    activos,
                    inactivos,
                    usuariosPorRol: usuariosPorRol.map(item => ({
                        rol: item.Rol?.Nombre,
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