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

                return {
                    IdRol: rol.IdRol,
                    Nombre: rol.Nombre,
                    Estado: rol.Estado,
                    EstadoTexto: rol.Estado ? 'Activo' : 'Inactivo',
                    CantidadUsuarios: cantidadUsuarios
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

            res.status(200).json({
                success: true,
                data: {
                    IdRol: rol.IdRol,
                    Nombre: rol.Nombre,
                    Estado: rol.Estado,
                    PermisosAsignados: permisos.map(p => p.IdPermiso),
                    PermisosPorModulo: permisosPorModulo
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
     * Crear un nuevo rol
     * @route POST /api/roles
     */
    createRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { Nombre, permisos = [] } = req.body;

            // Validar datos
            const validationErrors = await validateRol({ Nombre });
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
                Estado: true
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
            const { Nombre, Estado } = req.body;

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
            if (Estado !== undefined) updateData.Estado = Estado;

            await rol.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdRol: rol.IdRol,
                    Nombre: rol.Nombre,
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
                    message: 'No se puede eliminar el rol porque tiene usuarios asignados'
                });
            }

            await rol.update({ Estado: false }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Rol desactivado exitosamente'
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
     * Obtener roles activos (para selects)
     * @route GET /api/roles/activos
     */
    getRolesActivos: async (req, res) => {
        try {
            const roles = await Rol.findAll({
                where: { Estado: true },
                attributes: ['IdRol', 'Nombre'],
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