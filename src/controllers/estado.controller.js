// controllers/estado.controller.js
import Estado from '../models/estado.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Estados (Catálogo)
 */
const estadoController = {
    /**
     * Obtener todos los estados
     * @route GET /api/estados
     */
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', tipo, activos } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { Nombre: { [Op.iLike]: `%${search}%` } },
                    { Tipo: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            if (tipo) {
                whereClause.Tipo = tipo;
            }
            
            if (activos !== undefined) {
                whereClause.Estado = activos === 'true';
            }

            const { count, rows } = await Estado.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['IdEstado', 'ASC']]
            });

            return res.json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            console.error('❌ Error en getAll estados:', error);
            return errorResponse(res, 'Error al obtener estados', 500, error.message);
        }
    },

    /**
     * Obtener estados por tipo (ventas, compras, etc)
     * @route GET /api/estados/tipo/:tipo
     */
    getByTipo: async (req, res) => {
        try {
            const { tipo } = req.params;

            const estados = await Estado.findAll({
                where: { 
                    Tipo: tipo,
                    Estado: true 
                },
                order: [['Orden', 'ASC']]
            });

            return successResponse(res, estados, 'Estados obtenidos exitosamente');

        } catch (error) {
            console.error('❌ Error en getByTipo:', error);
            return errorResponse(res, 'Error al obtener estados', 500, error.message);
        }
    },

    /**
     * Obtener estado por ID
     * @route GET /api/estados/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de estado inválido', 400);
            }

            const estado = await Estado.findByPk(id);
            if (!estado) {
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            return successResponse(res, estado, 'Estado obtenido exitosamente');

        } catch (error) {
            console.error('❌ Error en getById estado:', error);
            return errorResponse(res, 'Error al obtener estado', 500, error.message);
        }
    },

    /**
     * Crear estado
     * @route POST /api/estados
     */
    create: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { Nombre, Tipo, Orden, Descripcion, Color } = req.body;

            if (!Nombre || !Tipo) {
                await transaction.rollback();
                return errorResponse(res, 'Nombre y Tipo son requeridos', 400);
            }

            const nuevoEstado = await Estado.create({
                Nombre,
                Tipo,
                Orden: Orden || 0,
                Descripcion,
                Color: Color || '#6c757d',
                Estado: true
            }, { transaction });

            await transaction.commit();

            return successResponse(res, nuevoEstado, 'Estado creado exitosamente', 201);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en create estado:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return errorResponse(res, 'El nombre del estado ya existe', 400);
            }
            
            return errorResponse(res, 'Error al crear estado', 500, error.message);
        }
    },

    /**
     * Actualizar estado
     * @route PUT /api/estados/:id
     */
    update: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { Nombre, Tipo, Orden, Descripcion, Color, Estado: activo } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de estado inválido', 400);
            }

            const estado = await Estado.findByPk(id);
            if (!estado) {
                await transaction.rollback();
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre;
            if (Tipo) updateData.Tipo = Tipo;
            if (Orden !== undefined) updateData.Orden = Orden;
            if (Descripcion) updateData.Descripcion = Descripcion;
            if (Color) updateData.Color = Color;
            if (activo !== undefined) updateData.Estado = activo;

            await estado.update(updateData, { transaction });
            await transaction.commit();

            return successResponse(res, estado, 'Estado actualizado exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en update estado:', error);
            return errorResponse(res, 'Error al actualizar estado', 500, error.message);
        }
    },

    /**
     * Actualización parcial de estado
     * @route PATCH /api/estados/:id
     */
    patch: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de estado inválido', 400);
            }

            const estado = await Estado.findByPk(id);
            if (!estado) {
                await transaction.rollback();
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            await estado.update(req.body, { transaction });
            await transaction.commit();

            return successResponse(res, estado, 'Estado actualizado parcialmente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en patch estado:', error);
            return errorResponse(res, 'Error al actualizar estado', 500, error.message);
        }
    },

    /**
     * Cambiar estado (activar/desactivar)
     * @route PATCH /api/estados/:id/estado
     */
    toggleStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de estado inválido', 400);
            }

            const estado = await Estado.findByPk(id);
            if (!estado) {
                await transaction.rollback();
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            await estado.update({ Estado: !estado.Estado }, { transaction });
            await transaction.commit();

            return successResponse(res, {
                IdEstado: estado.IdEstado,
                Nombre: estado.Nombre,
                Estado: estado.Estado
            }, `Estado ${estado.Estado ? 'activado' : 'desactivado'} exitosamente`);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleStatus:', error);
            return errorResponse(res, 'Error al cambiar estado', 500, error.message);
        }
    },

    /**
     * Eliminar estado (borrado lógico)
     * @route DELETE /api/estados/:id
     */
    delete: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de estado inválido', 400);
            }

            const estado = await Estado.findByPk(id);
            if (!estado) {
                await transaction.rollback();
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            // Verificar si el estado está siendo usado en otras tablas
            // Esta validación depende de tu modelo de datos
            // const enUso = await algunaTabla.count({ where: { IdEstado: id } });
            // if (enUso > 0) {
            //     await transaction.rollback();
            //     return errorResponse(res, 'No se puede eliminar el estado porque está en uso', 400);
            // }

            await estado.update({ Estado: false }, { transaction });
            await transaction.commit();

            return successResponse(res, null, 'Estado eliminado exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en delete estado:', error);
            return errorResponse(res, 'Error al eliminar estado', 500, error.message);
        }
    }
};

export default estadoController;