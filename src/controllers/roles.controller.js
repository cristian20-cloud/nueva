// controllers/roles.controller.js
import { Op } from 'sequelize';
import Rol from '../models/roles.model.js';
import Usuario from '../models/usuarios.model.js';
import Permiso from '../models/permisos.model.js';
import DetallePermiso from '../models/detallePermisos.model.js';
import { validateRol } from '../utils/validationUtils.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Roles
 * Maneja todas las operaciones CRUD para roles
 */
const rolController = {
    /**
     * Obtener todos los roles con filtros
     * @route GET /api/roles
     */
    getAllRoles: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search = '', 
                estado 
            } = req.query;

            const offset = (page - 1) * limit;

            // Construir filtros
            const whereClause = {};
            
            if (search) {
                whereClause.Nombre = { [Op.like]: `%${search}%` };
            }
            
            if (estado !== undefined) {
                whereClause.Estado = estado === 'true';
            }

            // Consultar roles
            const { count, rows } = await Rol.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['IdRol', 'ASC']]
            });

            // Obtener cantidad de usuarios por rol
            const rolesFormateados = await Promise.all(rows.map(async (rol) => {
                const cantidadUsuarios = await Usuario.count({
                    where: { IdRol: rol.IdRol }
                });

                // Obtener permisos del rol
                const permisos = await DetallePermiso.findAll({
                    where: { IdRol: rol.IdRol },
                    include: [{
                        model: Permiso,
                        as: 'Permiso',
                        attributes: ['IdPermiso', 'Nombre', 'Modulo']
                    }]
                });

                return {
                    IdRol: rol.IdRol,
                    Nombre: rol.Nombre,
                    Descripcion: rol.Descripcion,
                    Estado: rol.Estado,
                    EstadoTexto: rol.Estado ? 'Activo' : 'Inactivo',
                    CantidadUsuarios: cantidadUsuarios,
                    Permisos: permisos.map(p => ({
                        IdPermiso: p.IdPermiso,
                        Nombre: p.Permiso?.Nombre,
                        Modulo: p.Permiso?.Modulo
                    }))
                };
            }));

            const totalPages = Math.ceil(count / limit);

            res.status(200).json({
                success: true,
                data: rolesFormateados,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    showingFrom: offset + 1,
                    showingTo: Math.min(offset + parseInt(limit), count)
                },
                message: 'Roles obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getAllRoles:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los roles',
                error: error.message
            });
        }
    },

    /**
     * Obtener un rol por ID con sus permisos
     * @route GET /api/roles/:id
     */
    getRolById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Obtener permisos del rol
            const permisos = await DetallePermiso.findAll({
                where: { IdRol: id },
                include: [{
                    model: Permiso,
                    as: 'Permiso',
                    attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
                }]
            });

            // Obtener todos los permisos disponibles agrupados por módulo
            const todosPermisos = await Permiso.findAll({
                order: [['Modulo', 'ASC'], ['IdPermiso', 'ASC']]
            });

            // Agrupar permisos por módulo
            const permisosPorModulo = {};
            todosPermisos.forEach(permiso => {
                if (!permisosPorModulo[permiso.Modulo]) {
                    permisosPorModulo[permiso.Modulo] = [];
                }
                permisosPorModulo[permiso.Modulo].push({
                    IdPermiso: permiso.IdPermiso,
                    Nombre: permiso.Nombre,
                    Accion: permiso.Accion,
                    Asignado: permisos.some(p => p.IdPermiso === permiso.IdPermiso)
                });
            });

            // Obtener usuarios con este rol
            const usuarios = await Usuario.findAll({
                where: { IdRol: id, Estado: 'activo' },
                attributes: ['IdUsuario', 'Nombre', 'Correo'],
                limit: 10
            });

            res.status(200).json({
                success: true,
                data: {
                    IdRol: rol.IdRol,
                    Nombre: rol.Nombre,
                    Descripcion: rol.Descripcion,
                    Estado: rol.Estado,
                    PermisosAsignados: permisos.map(p => p.IdPermiso),
                    PermisosPorModulo: permisosPorModulo,
                    Usuarios: usuarios
                },
                message: 'Rol obtenido exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getRolById:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el rol',
                error: error.message
            });
        }
    },

    /**
     * Obtener permisos de un rol
     * @route GET /api/roles/:id/permisos
     */
    getPermisosByRol: async (req, res) => {
        try {
            const { id } = req.params;

            const permisos = await DetallePermiso.findAll({
                where: { IdRol: id },
                include: [{
                    model: Permiso,
                    as: 'Permiso',
                    attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
                }]
            });

            res.status(200).json({
                success: true,
                data: permisos.map(p => p.Permiso),
                message: 'Permisos del rol obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getPermisosByRol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener permisos del rol',
                error: error.message
            });
        }
    },

    /**
     * Crear un nuevo rol
     * @route POST /api/roles
     */
    createRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { Nombre, Descripcion, permisos = [] } = req.body;

            // Validar datos
            const validationErrors = await validateRol({ Nombre, Descripcion });
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    errors: validationErrors,
                    message: 'Datos del rol inválidos'
                });
            }

            // Crear rol
            const nuevoRol = await Rol.create({
                Nombre,
                Descripcion,
                Estado: true,
                Permisos: permisos // Guardar en cache
            }, { transaction });

            // Asignar permisos si se proporcionan
            if (permisos.length > 0) {
                for (const idPermiso of permisos) {
                    await DetallePermiso.create({
                        IdRol: nuevoRol.IdRol,
                        IdPermiso: idPermiso
                    }, { transaction });
                }
            }

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: {
                    IdRol: nuevoRol.IdRol,
                    Nombre: nuevoRol.Nombre,
                    Descripcion: nuevoRol.Descripcion,
                    PermisosAsignados: permisos
                },
                message: 'Rol creado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createRol:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un rol con ese nombre'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al crear el rol',
                error: error.message
            });
        }
    },

    /**
     * Actualizar un rol
     * @route PUT /api/roles/:id
     */
    updateRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { Nombre, Descripcion, Estado } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Validar datos
            if (Nombre) {
                const validationErrors = await validateRol({ Nombre }, id);
                if (validationErrors.length > 0) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        errors: validationErrors,
                        message: 'Datos del rol inválidos'
                    });
                }
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre;
            if (Descripcion !== undefined) updateData.Descripcion = Descripcion;
            if (Estado !== undefined) updateData.Estado = Estado;

            await rol.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdRol: rol.IdRol,
                    Nombre: rol.Nombre,
                    Descripcion: rol.Descripcion,
                    Estado: rol.Estado
                },
                message: 'Rol actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateRol:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe otro rol con ese nombre'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al actualizar el rol',
                error: error.message
            });
        }
    },

    /**
     * Actualización parcial de rol
     * @route PATCH /api/roles/:id
     */
    patchRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            await rol.update(req.body, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: rol,
                message: 'Rol actualizado parcialmente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en patchRol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar el rol',
                error: error.message
            });
        }
    },

    /**
     * Activar/desactivar rol
     * @route PATCH /api/roles/:id/estado
     */
    toggleRolStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            await rol.update({ Estado: !rol.Estado }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdRol: rol.IdRol,
                    Estado: rol.Estado,
                    EstadoTexto: rol.Estado ? 'Activo' : 'Inactivo'
                },
                message: `Rol ${rol.Estado ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleRolStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Error al cambiar el estado del rol',
                error: error.message
            });
        }
    },

    /**
     * Eliminar un rol (borrado lógico)
     * @route DELETE /api/roles/:id
     */
    deleteRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Verificar si tiene usuarios asignados
            const usuariosAsignados = await Usuario.count({
                where: { IdRol: id }
            });

            if (usuariosAsignados > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar el rol porque tiene ${usuariosAsignados} usuarios asignados`
                });
            }

            // Eliminar permisos asociados
            await DetallePermiso.destroy({
                where: { IdRol: id },
                transaction
            });

            // Eliminar el rol (físicamente o lógicamente)
            // Opción 1: Borrado físico (real)
            // await rol.destroy({ transaction });
            
            // Opción 2: Borrado lógico (recomendado)
            await rol.update({ Estado: false }, { transaction });

            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Rol eliminado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteRol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar el rol',
                error: error.message
            });
        }
    },

    /**
     * Asignar permisos a un rol
     * @route POST /api/roles/:id/permisos
     */
    asignarPermisos: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { permisos } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            if (!permisos || !Array.isArray(permisos)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar un array de permisos'
                });
            }

            // Eliminar permisos actuales
            await DetallePermiso.destroy({
                where: { IdRol: id },
                transaction
            });

            // Asignar nuevos permisos
            for (const idPermiso of permisos) {
                await DetallePermiso.create({
                    IdRol: id,
                    IdPermiso: idPermiso
                }, { transaction });
            }

            // Actualizar cache en el rol
            await rol.update({ Permisos: permisos }, { transaction });

            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdRol: id,
                    PermisosAsignados: permisos
                },
                message: 'Permisos asignados exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en asignarPermisos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al asignar permisos',
                error: error.message
            });
        }
    },

    /**
     * Agregar un permiso específico a un rol
     * @route POST /api/roles/:id/permisos/agregar
     */
    agregarPermiso: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { idPermiso } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Verificar si ya tiene el permiso
            const existe = await DetallePermiso.findOne({
                where: { IdRol: id, IdPermiso: idPermiso }
            });

            if (!existe) {
                await DetallePermiso.create({
                    IdRol: id,
                    IdPermiso: idPermiso
                }, { transaction });

                // Actualizar cache
                const permisosActuales = rol.Permisos || [];
                await rol.update({
                    Permisos: [...permisosActuales, idPermiso]
                }, { transaction });
            }

            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Permiso agregado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en agregarPermiso:', error);
            res.status(500).json({
                success: false,
                message: 'Error al agregar permiso',
                error: error.message
            });
        }
    },

    /**
     * Quitar un permiso específico de un rol
     * @route DELETE /api/roles/:id/permisos/:permisoId
     */
    quitarPermiso: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id, permisoId } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de rol inválido'
                });
            }

            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            await DetallePermiso.destroy({
                where: { IdRol: id, IdPermiso: permisoId },
                transaction
            });

            // Actualizar cache
            const permisosActuales = rol.Permisos || [];
            await rol.update({
                Permisos: permisosActuales.filter(p => p !== permisoId)
            }, { transaction });

            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Permiso removido exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en quitarPermiso:', error);
            res.status(500).json({
                success: false,
                message: 'Error al quitar permiso',
                error: error.message
            });
        }
    },

    /**
     * Obtener roles activos (para selects)
     * @route GET /api/roles/activos
     */
    getRolesActivos: async (req, res) => {
        try {
            const roles = await Rol.findAll({
                where: { Estado: true },
                attributes: ['IdRol', 'Nombre', 'Descripcion'],
                order: [['Nombre', 'ASC']]
            });

            res.status(200).json({
                success: true,
                data: roles,
                message: 'Roles activos obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getRolesActivos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener roles activos',
                error: error.message
            });
        }
    }
};

export default rolController;