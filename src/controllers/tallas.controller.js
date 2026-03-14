// controllers/tallas.controller.js
import { Op } from 'sequelize';
import Talla from '../models/tallas.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Controlador de Tallas - VERSIÓN SIMPLE (sin relaciones)
 */
const tallaController = {
    /**
     * Obtener todas las tallas
     * @route GET /api/tallas
     */
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', estado } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { Nombre: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            if (estado !== undefined) {
                whereClause.Estado = estado === 'true';
            }

            const { count, rows } = await Talla.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Nombre', 'ASC']]
            });

            const totalPages = Math.ceil(count / limit);

            return res.json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages,
                    limit: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('❌ Error en getAll tallas:', error);
            return errorResponse(res, 'Error al obtener tallas', 500, error.message);
        }
    },

    /**
     * Obtener tallas activas
     * @route GET /api/tallas/activas
     */
    getActivas: async (req, res) => {
        try {
            const tallas = await Talla.findAll({
                where: { Estado: true },
                attributes: ['IdTalla', 'Nombre'],
                order: [['Nombre', 'ASC']]
            });

            return successResponse(res, tallas, 'Tallas activas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getActivas:', error);
            return errorResponse(res, 'Error al obtener tallas activas', 500, error.message);
        }
    },

    /**
     * Obtener talla por ID
     * @route GET /api/tallas/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);

            if (!talla) {
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            return successResponse(res, talla, 'Talla obtenida exitosamente');

        } catch (error) {
            console.error('❌ Error en getById talla:', error);
            return errorResponse(res, 'Error al obtener talla', 500, error.message);
        }
    },

    /**
     * Crear talla
     * @route POST /api/tallas
     */
    create: async (req, res) => {
        try {
            const { Nombre, Cantidad = 0, Estado = true } = req.body;

            if (!Nombre) {
                return errorResponse(res, 'El nombre de la talla es requerido', 400);
            }

            // Verificar si ya existe la talla (por nombre)
            const existe = await Talla.findOne({
                where: { Nombre: Nombre.toUpperCase().trim() }
            });

            if (existe) {
                return errorResponse(res, 'Ya existe una talla con ese nombre', 400);
            }

            const nuevaTalla = await Talla.create({
                Nombre: Nombre.toUpperCase().trim(),
                Cantidad: parseInt(Cantidad) || 0,
                Estado
            });

            return successResponse(res, nuevaTalla, 'Talla creada exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en create talla:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return errorResponse(res, 'El nombre de la talla ya existe', 400);
            }
            
            return errorResponse(res, 'Error al crear talla', 500, error.message);
        }
    },

    /**
     * Actualizar talla
     * @route PUT /api/tallas/:id
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { Nombre, Cantidad, Estado } = req.body;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);
            if (!talla) {
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre.toUpperCase().trim();
            if (Cantidad !== undefined) updateData.Cantidad = parseInt(Cantidad);
            if (Estado !== undefined) updateData.Estado = Estado;

            await talla.update(updateData);

            return successResponse(res, talla, 'Talla actualizada exitosamente');

        } catch (error) {
            console.error('❌ Error en update talla:', error);
            return errorResponse(res, 'Error al actualizar talla', 500, error.message);
        }
    },

    /**
     * Cambiar estado de la talla (activar/desactivar)
     * @route PATCH /api/tallas/:id/estado
     */
    toggleStatus: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);
            if (!talla) {
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            await talla.update({ Estado: !talla.Estado });

            return successResponse(res, {
                IdTalla: talla.IdTalla,
                Nombre: talla.Nombre,
                Estado: talla.Estado
            }, `Talla ${talla.Estado ? 'activada' : 'desactivada'} exitosamente`);

        } catch (error) {
            console.error('❌ Error en toggleStatus:', error);
            return errorResponse(res, 'Error al cambiar estado', 500, error.message);
        }
    },

    /**
     * Eliminar talla (borrado lógico - desactivar)
     * @route DELETE /api/tallas/:id
     */
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);
            if (!talla) {
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            // Borrado lógico (desactivar)
            await talla.update({ Estado: false });

            return successResponse(res, null, 'Talla desactivada exitosamente');

        } catch (error) {
            console.error('❌ Error en delete talla:', error);
            return errorResponse(res, 'Error al eliminar talla', 500, error.message);
        }
    }
};

export default tallaController;